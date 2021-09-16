import { LogDescription } from '@ethersproject/abi';
import { BigNumber } from '@ethersproject/bignumber';
import { arrayify, hexlify } from '@ethersproject/bytes';
import { ContractReceipt } from '@ethersproject/contracts';
import { OpticsContext } from '..';
import { core } from '@optics-xyz/ts-interface';
import { delay } from '../../utils';

// match the typescript declaration
export interface DispatchEvent {
  transactionHash: string;
  args: {
    messageHash: string;
    leafIndex: BigNumber;
    destinationAndNonce: BigNumber;
    committedRoot: string;
    message: string;
  };
}

export type ParsedMessage = {
  from: number;
  sender: string;
  nonce: number;
  destination: number;
  recipient: string;
  body: string;
};

enum MessageStatus {
  None = 0,
  Proven,
  Processed,
}

export function parseMessage(message: string): ParsedMessage {
  const buf = Buffer.from(arrayify(message));

  const from = buf.readUInt32BE(0);
  const sender = hexlify(buf.slice(4, 36));
  const nonce = buf.readUInt32BE(36);
  const destination = buf.readUInt32BE(40);
  const recipient = hexlify(buf.slice(44, 76));
  const body = hexlify(buf.slice(76));

  return { from, sender, nonce, destination, recipient, body };
}

export class OpticsMessage {
  readonly receipt: ContractReceipt;
  readonly event: DispatchEvent;
  readonly messageHash: string;
  readonly leafIndex: BigNumber;
  readonly destinationAndNonce: BigNumber;
  readonly committedRoot: string;
  readonly message: ParsedMessage;

  protected context: OpticsContext;

  constructor(receipt: ContractReceipt, context: OpticsContext) {
    this.receipt = receipt;

    // find the first dispatch log by attempting to parse them
    let event;
    const iface = new core.Home__factory().interface;
    for (const log of receipt.logs) {
      let parsed: LogDescription;
      try {
        parsed = iface.parseLog(log);
      } catch (e) {
        continue;
      }
      if (parsed.name === 'Dispatch') {
        event = parsed as unknown as DispatchEvent;
      }
    }

    if (!event) {
      throw new Error('No matching event found');
    }

    this.event = event;

    this.messageHash = event.args.messageHash;
    this.leafIndex = event.args.leafIndex;
    this.destinationAndNonce = event.args.destinationAndNonce;
    this.committedRoot = event.args.committedRoot;
    this.message = parseMessage(event.args.message);

    this.context = context;
  }

  async status(): Promise<MessageStatus> {
    const replica = this.context.getReplicaFor(this.from, this.destination);
    if (!replica) {
      throw new Error(
        `No replica on ${this.destination} for home ${this.from}`,
      );
    }

    return await replica.messages(this.messageHash);
  }

  /// Returns true when the message is delivered
  async delivered(): Promise<boolean> {
    const status = await this.status();
    return status === MessageStatus.Processed;
  }

  /// Resolves when the message has been delivered.
  /// May never resolve. May take hours to resolve.
  async wait(opts?: { pollTime?: number }): Promise<void> {
    const interval = opts?.pollTime ?? 5000;
    while (true) {
      if (await this.delivered()) {
        return;
      }
      await delay(interval);
    }
  }

  get from(): number {
    return this.message.from;
  }

  get origin(): number {
    return this.from;
  }

  get sender(): string {
    return this.message.sender;
  }

  get nonce(): number {
    return this.message.nonce;
  }

  get destination(): number {
    return this.message.destination;
  }

  get recipient(): string {
    return this.message.recipient;
  }

  get body(): string {
    return this.message.body;
  }

  get transactionHash(): string {
    return this.receipt.transactionHash;
  }
}

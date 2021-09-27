import {BigNumber} from '@ethersproject/bignumber';
import {arrayify, hexlify} from '@ethersproject/bytes';
import {TransactionReceipt} from '@ethersproject/abstract-provider';
import {core} from '@optics-xyz/ts-interface';
import {OpticsContext} from '..';
import {delay} from '../../utils';
import {MultiEvents, OpticsStatus, OpticsEvent, DispatchEvent, UpdateEvent, ProcessEvent} from "../events";

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

function tryDispatchEvent(log: Log): DispatchEvent | undefined {
  const home = new core.Home__factory().interface;
  try {
    const parsed = home.parseLog(log);
    if (parsed.name === 'Dispatch') {
      return parsed as unknown as DispatchEvent;
    }
  } catch (e) {}
  return undefined;
}

export class OpticsMessage {
  readonly event: DispatchEvent;
  readonly receipt: TransactionReceipt;
  readonly messageHash: string;
  readonly leafIndex: BigNumber;
  readonly destinationAndNonce: BigNumber;
  readonly committedRoot: string;
  readonly message: ParsedMessage;
  protected context: OpticsContext;

  constructor(event: DispatchEvent, receipt: TransactionReceipt, context: OpticsContext) {
    this.event = event;
    this.receipt = receipt;
    this.messageHash = event.args.messageHash;
    this.leafIndex = event.args.leafIndex;
    this.destinationAndNonce = event.args.destinationAndNonce;
    this.committedRoot = event.args.committedRoot;
    this.message = parseMessage(event.args.message);
    this.context = context;
  }

  static async fromTransactionHash(
      nameOrDomain: string | number,
      transactionHash: string,
      context: OpticsContext,
  ): Promise<OpticsMessage[]> {
    const receipt = await context.getTransactionReceipt(nameOrDomain, transactionHash);
    return OpticsMessage.fromReceipt(receipt!, context);
  }

  static async singleFromTransactionHash(
      nameOrDomain: string | number,
      transactionHash: string,
      context: OpticsContext,
  ): Promise<OpticsMessage> {
    const receipt = await context.getTransactionReceipt(nameOrDomain, transactionHash);
    return OpticsMessage.singleFromReceipt(receipt!, context);
  }

  static fromReceipt(
      receipt: TransactionReceipt,
      context: OpticsContext,
  ): OpticsMessage[] {
    let messages: OpticsMessage[] = [];
    for (const log of receipt.logs) {
      const event = tryDispatchEvent(log);
      if (event) {
        const message = new OpticsMessage(event, receipt, context);
        messages.push(message);
      }
    }
    return messages;
  }

  static singleFromReceipt(
      receipt: TransactionReceipt,
      context: OpticsContext,
  ): OpticsMessage {
    const messages: OpticsMessage[] = OpticsMessage.fromReceipt(receipt, context);
    if (messages.length > 1) {
      throw new Error("Expected single Dispatch in transaction");
    }
    return messages[0];
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
    return this.event.transactionHash;
  }
}

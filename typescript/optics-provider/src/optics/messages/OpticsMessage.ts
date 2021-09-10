import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { TypedEvent } from '../../../../typechain/optics-core/commons';
import { arrayify, hexlify } from '@ethersproject/bytes';
import { OpticsContext } from '..';

// match the typescript declaration
export type DispatchEvent = TypedEvent<
  [string, BigNumber, BigNumber, string, string]
> & {
  args: {
    messageHash: string;
    leafIndex: BigNumber;
    destinationAndNonce: BigNumber;
    committedRoot: string;
    message: string;
  };
};

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
  readonly event: DispatchEvent;
  readonly messageHash: string;
  readonly leafIndex: BigNumber;
  readonly destinationAndNonce: BigNumber;
  readonly committedRoot: string;
  readonly message: ParsedMessage;

  protected context: OpticsContext;

  constructor(event: DispatchEvent, context: OpticsContext) {
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
}

import { BigNumber, BigNumberish } from '@ethersproject/bignumber';
import { TypedEvent } from '../../typechain/optics-core/commons';
import { Home, Replica } from '../../typechain/optics-core';

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

enum MessageStatus {
  None = 0,
  Proven,
  Processed,
}

export class OpticsMessage {
  readonly event: DispatchEvent;
  readonly messageHash: string;
  readonly leafIndex: BigNumber;
  readonly destinationAndNonce: BigNumber;
  readonly committedRoot: string;
  readonly message: string;

  private origin: Home;
  private destination: Replica;

  constructor(event: DispatchEvent, origin: Home, destination: Replica) {
    this.event = event;
    this.messageHash = event.args.messageHash;
    this.leafIndex = event.args.leafIndex;
    this.destinationAndNonce = event.args.destinationAndNonce;
    this.committedRoot = event.args.committedRoot;
    this.message = event.args.message;
    this.origin = origin;
    this.destination = destination;
  }

  async status(): Promise<MessageStatus> {
    const status = await this.destination.messages(this.messageHash);
    return status;
  }
}

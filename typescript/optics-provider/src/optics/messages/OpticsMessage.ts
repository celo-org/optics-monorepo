import {BigNumber} from '@ethersproject/bignumber';
import {arrayify, hexlify} from '@ethersproject/bytes';
import {TransactionReceipt} from '@ethersproject/abstract-provider';
import {core} from '@optics-xyz/ts-interface';
import {OpticsContext} from '..';
import {delay} from '../../utils';
import {getEvents, OpticsEvent, DispatchEvent, UpdateEvent, ProcessEvent} from "../events";

export type ParsedMessage = {
  from: number;
  sender: string;
  nonce: number;
  destination: number;
  recipient: string;
  body: string;
};

export type OpticsStatus = {
  status: MessageStatus;
  events: OpticsEvent[];
}

export enum MessageStatus {
  Dispatched = 0,
  Included = 1,
  Relayed = 2,
  Processed = 3
};

enum ReplicaMessageStatus {
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
  readonly receipt: TransactionReceipt;
  readonly messageHash: string;
  readonly leafIndex: BigNumber;
  readonly destinationAndNonce: BigNumber;
  readonly committedRoot: string;
  readonly message: ParsedMessage;
  readonly home: core.Home;
  readonly replica: core.Replica;
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
    this.home = context.mustGetCore(this.message.from).home;
    this.replica = context.mustGetReplicaFor(this.message.from, this.message.destination);
  }

  static fromReceipt(
      receipt: TransactionReceipt,
      context: OpticsContext,
  ): OpticsMessage[] {
    const messages: OpticsMessage[] = [];
    const home = new core.Home__factory().interface;
    for (let log of receipt.logs) {
      try {
        const parsed = home.parseLog(log);
        if (parsed.name === "Dispatch") {
          const dispatch = parsed as unknown as DispatchEvent;
          const message = new OpticsMessage(dispatch, receipt, context);
          messages.push(message);
        }
      } catch (e) {}
    }
    return messages;
  }

  static singleFromReceipt(
      receipt: TransactionReceipt,
      context: OpticsContext,
  ): OpticsMessage {
    const messages: OpticsMessage[] = OpticsMessage.fromReceipt(receipt, context);
    if (messages.length !== 1) {
      throw new Error("Expected single Dispatch in transaction");
    }
    return messages[0];
  }

  static async fromTransactionHash(
      nameOrDomain: string | number,
      transactionHash: string,
      context: OpticsContext,
  ): Promise<OpticsMessage[]> {
    const provider = context.mustGetProvider(nameOrDomain);
    const receipt = await provider.getTransactionReceipt(transactionHash);
    return OpticsMessage.fromReceipt(receipt!, context);
  }

  static async singleFromTransactionHash(
      nameOrDomain: string | number,
      transactionHash: string,
      context: OpticsContext,
  ): Promise<OpticsMessage> {
    const provider = context.mustGetProvider(nameOrDomain);
    const receipt = await provider.getTransactionReceipt(transactionHash);
    return OpticsMessage.singleFromReceipt(receipt!, context);
  }

  dispatchEvent(): DispatchEvent {
    return this.event;
  }

  async homeUpdateEvent(): Promise<UpdateEvent> {
    const updateFilter = this.home.filters.Update(this.from, this.committedRoot);
    const updateLogs = await getEvents(this.context, this.from, this.home, updateFilter);
    return updateLogs[0] as unkown as UpdateEvent;
  }

  async replicaUpdateEvent(): Promise<UpdateEvent> {
    const updateFilter = this.replica.filters.Update(this.from, this.committedRoot);
    const updateLogs = await getEvents(this.context, this.destination, this.replica, updateFilter);
    return updateLogs[0] as unkown as UpdateEvent;
  }

  async processEvent(): Promise<ProcessEvent> {
    const processFilter = this.replica.filters.Process(this.messageHash);
    const processLogs = await getEvents(this.context, this.destination, this.replica, processFilter);
    return processLogs[0] as unkown as ProcessEvent;
  }

  async events(): Promise<OpticsStatus> {
    const events: OpticsEvent[] = [this.event];
    // attempt to get Home update
    const homeUpdate = await this.homeUpdateEvent();
    if (!homeUpdate) {
      return {
        status: MessageStatus.Dispatched, // the message has been sent; nothing more
        events
      };
    }
    events.push(homeUpdate);
    // attempt to get Replica update
    const replicaUpdate = await this.replicaUpdateEvent();
    if (!replicaUpdate) {
      return {
        status: MessageStatus.Included, // the message was sent, then included in an Update on Home
        events
      };
    }
    events.push(replicaUpdate);
    // attempt to get Replica process
    const process = await this.processEvent();
    if (!process) {
      // NOTE: when this is the status, you may way to
      // query confirmAt() to check if challenge period
      // on the Replica has elapsed or not
      return {
        status: MessageStatus.Relayed, // the message was sent, included in an Update, then relayed to the Replica
        events
      };
    }
    events.push(process);
    return {
      status: MessageStatus.Processed, // the message was processed
      events
    };
  }

  // Note: return the timestamp after which it is possible to process messages within an Update
  // the timestamp is most relevant during the time AFTER the Update has been Relayed to the Replica
  // and BEFORE the message in question has been Processed.
  // ****
  // - the timestamp will be 0 if the Update has not been relayed to the Replica
  // - after the Update has been relayed to the Replica, the timestamp will be non-zero forever (even after all messages in the Update have been processed)
  // - if the timestamp is in the future, the challenge period has not elapsed yet; messages in the Update cannot be processed yet
  // - if the timestamp is in the past, this does not necessarily mean that all messages in the Update have been processed
  async confirmAt(): Promise<BigNumber> {
    const update = await this.replicaUpdateEvent();
    const {newRoot} = update.args;
    return this.replica.confirmAt(newRoot);
  }

  async replicaStatus(): Promise<ReplicaMessageStatus> {
    return this.replica.messages(this.messageHash);
  }

  /// Returns true when the message is delivered
  async delivered(): Promise<boolean> {
    const status = await this.replicaStatus();
    return status === ReplicaMessageStatus.Processed;
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

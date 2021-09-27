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
  protected eventProvider: MultiEvents;

  constructor(event: DispatchEvent, receipt: TransactionReceipt, context: OpticsContext) {
    this.event = event;
    this.receipt = receipt;
    this.messageHash = event.args.messageHash;
    this.leafIndex = event.args.leafIndex;
    this.destinationAndNonce = event.args.destinationAndNonce;
    this.committedRoot = event.args.committedRoot;
    this.message = parseMessage(event.args.message);
    this.context = context;
    this.eventProvider = new MultiEvents(context);
    this.home = context.mustGetCore(this.message.from).home;
    this.replica = context.mustGetReplicaFor(this.message.from, this.message.destination);
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

  static fromReceipt(
      receipt: TransactionReceipt,
      context: OpticsContext,
  ): OpticsMessage[] {
    let messages: OpticsMessage[] = [];
    for (const log of receipt.logs) {
      const event = MultiEvents.tryDispatchEvent(log);
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

  dispatchEvent(): DispatchEvent {
    return this.event;
  }

  async homeUpdateEvent(): Promise<UpdateEvent> {
    const updateFilter = this.home.filters.Update(this.from, this.committedRoot);
    const updateLogs = await this.eventProvider.getEvents(this.from, this.home, updateFilter);
    return updateLogs[0] as unkown as UpdateEvent;
  }

  async replicaUpdateEvent(): Promise<UpdateEvent> {
    const updateFilter = this.replica.filters.Update(this.from, this.committedRoot);
    const updateLogs = await this.eventProvider.getEvents(this.destination, this.replica, updateFilter);
    return updateLogs[0] as unkown as UpdateEvent;
  }

  async processEvent(): Promise<ProcessEvent> {
    const processFilter = this.replica.filters.Process(this.messageHash);
    const processLogs = await this.eventProvider.getEvents(this.destination, this.replica, processFilter);
    return processLogs[0] as unkown as ProcessEvent;
  }

  async events(): Promise<OpticsStatus> {
    const events: OpticsEvent[] = [this.event];
    // attempt to get Home update
    const homeUpdate = await this.homeUpdateEvent();
    if (!homeUpdate) {
      return {
        status: "Dispatched", // the message has been sent; nothing more
        events
      };
    }
    events.push(homeUpdate);
    // attempt to get Replica update
    const replicaUpdate = await this.replicaUpdateEvent();
    if (!replicaUpdate) {
      return {
        status: "Included", // the message was sent, then included in an Update on Home
        events
      };
    }
    events.push(replicaUpdate);
    // attempt to get Replica process
    const process = await this.processEvent();
    if (!process) {
      return {
        status: "Relayed", // the message was sent, included in an Update, then relayed to the Replica
        events
      };
    }
    events.push(process);
    return {
      status: "Processed", // the message was processed
      events
    };
  }

  async confirmAt(): Promise<BigNumber> {
    const update = await this.replicaUpdateEvent();
    const {newRoot} = update.args;
    return this.replica.confirmAt(newRoot);
  }

  async replicaStatus(): Promise<MessageStatus> {
    return this.replica.messages(this.messageHash);
  }

  /// Returns true when the message is delivered
  async delivered(): Promise<boolean> {
    const status = await this.replicaStatus();
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

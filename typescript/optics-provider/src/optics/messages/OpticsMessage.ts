import { BigNumber } from '@ethersproject/bignumber';
import { arrayify, hexlify } from '@ethersproject/bytes';
import { TransactionReceipt } from '@ethersproject/abstract-provider';
import { core } from '@optics-xyz/ts-interface';
import { OpticsContext } from '..';
import { delay } from '../../utils';
import {
  DispatchEvent,
  AnnotatedDispatch,
  annotate,
  AnnotatedUpdate,
  AnnotatedProcess,
  UpdateTypes,
  UpdateArgs,
  ProcessTypes,
  ProcessArgs,
  AnnotatedLifecycleEvent,
} from '../events';

import { queryAnnotatedEvents } from '..';

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
  events: AnnotatedLifecycleEvent[];
};

export enum MessageStatus {
  Dispatched = 0,
  Included = 1,
  Relayed = 2,
  Processed = 3,
}

export enum ReplicaMessageStatus {
  None = 0,
  Proven,
  Processed,
}

export type EventCache = {
  homeUpdate?: AnnotatedUpdate;
  replicaUpdate?: AnnotatedUpdate;
  process?: AnnotatedProcess;
};

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
  readonly dispatch: AnnotatedDispatch;
  readonly message: ParsedMessage;
  readonly home: core.Home;
  readonly replica: core.Replica;

  readonly context: OpticsContext;
  protected cache: EventCache;

  constructor(context: OpticsContext, dispatch: AnnotatedDispatch) {
    this.context = context;
    this.message = parseMessage(dispatch.event.args.message);
    this.dispatch = dispatch;
    this.home = context.mustGetCore(this.message.from).home;
    this.replica = context.mustGetReplicaFor(
      this.message.from,
      this.message.destination,
    );
    this.cache = {};
  }

  get receipt(): TransactionReceipt {
    return this.dispatch.receipt;
  }

  static fromReceipt(
    context: OpticsContext,
    nameOrDomain: string | number,
    receipt: TransactionReceipt,
  ): OpticsMessage[] {
    const messages: OpticsMessage[] = [];
    const home = new core.Home__factory().interface;

    for (let log of receipt.logs) {
      try {
        const parsed = home.parseLog(log);
        if (parsed.name === 'Dispatch') {
          const dispatch = parsed as any;
          dispatch.getBlock = () => {
            return context
              .mustGetProvider(nameOrDomain)
              .getBlock(log.blockHash);
          };
          dispatch.getTransaction = () => {
            return context
              .mustGetProvider(nameOrDomain)
              .getTransaction(log.transactionHash);
          };
          dispatch.getTransactionReceipt = () => {
            return context
              .mustGetProvider(nameOrDomain)
              .getTransactionReceipt(log.transactionHash);
          };

          const annotated = annotate(
            context.resolveDomain(nameOrDomain),
            receipt,
            dispatch as DispatchEvent,
          );
          annotated.name = 'Dispatch';
          annotated.event.blockNumber = annotated.receipt.blockNumber;
          const message = new OpticsMessage(context, annotated);
          messages.push(message);
        }
      } catch (e) {}
    }
    return messages;
  }

  static singleFromReceipt(
    context: OpticsContext,
    nameOrDomain: string | number,
    receipt: TransactionReceipt,
  ): OpticsMessage {
    const messages: OpticsMessage[] = OpticsMessage.fromReceipt(
      context,
      nameOrDomain,
      receipt,
    );
    if (messages.length !== 1) {
      throw new Error('Expected single Dispatch in transaction');
    }
    return messages[0];
  }

  static async fromTransactionHash(
    context: OpticsContext,
    nameOrDomain: string | number,
    transactionHash: string,
  ): Promise<OpticsMessage[]> {
    const provider = context.mustGetProvider(nameOrDomain);
    const receipt = await provider.getTransactionReceipt(transactionHash);
    if (!receipt) {
      throw new Error(`No receipt for ${transactionHash} on ${nameOrDomain}`);
    }
    return OpticsMessage.fromReceipt(context, nameOrDomain, receipt);
  }

  static async singleFromTransactionHash(
    context: OpticsContext,
    nameOrDomain: string | number,
    transactionHash: string,
  ): Promise<OpticsMessage> {
    const provider = context.mustGetProvider(nameOrDomain);
    const receipt = await provider.getTransactionReceipt(transactionHash);
    if (!receipt) {
      throw new Error(`No receipt for ${transactionHash} on ${nameOrDomain}`);
    }
    return OpticsMessage.singleFromReceipt(context, nameOrDomain, receipt);
  }

  async getHomeUpdate(): Promise<AnnotatedUpdate | undefined> {
    // if we have already gotten the event,
    // return it without re-querying
    if (this.cache.homeUpdate) {
      return this.cache.homeUpdate;
    }

    // if not, attempt to query the event
    const updateFilter = this.home.filters.Update(
      undefined,
      this.committedRoot,
    );

    const updateLogs: AnnotatedUpdate[] = await queryAnnotatedEvents<
      UpdateTypes,
      UpdateArgs
    >(this.context, this.origin, this.home, updateFilter);

    if (updateLogs.length === 1) {
      // if event is returned, store it to the object
      this.cache.homeUpdate = updateLogs[0];
    } else if (updateLogs.length > 1) {
      throw new Error('multiple home updates for same root');
    }
    // return the event or undefined if it doesn't exist
    return this.cache.homeUpdate;
  }

  async getReplicaUpdate(): Promise<AnnotatedUpdate | undefined> {
    // if we have already gotten the event,
    // return it without re-querying
    if (this.cache.replicaUpdate) {
      return this.cache.replicaUpdate;
    }
    // if not, attempt to query the event
    const updateFilter = this.replica.filters.Update(
      undefined,
      this.committedRoot,
    );
    const updateLogs: AnnotatedUpdate[] = await queryAnnotatedEvents<
      UpdateTypes,
      UpdateArgs
    >(this.context, this.destination, this.replica, updateFilter);
    if (updateLogs.length === 1) {
      // if event is returned, store it to the object
      this.cache.replicaUpdate = updateLogs[0];
    } else if (updateLogs.length > 1) {
      throw new Error('multiple replica updates for same root');
    }
    // return the event or undefined if it wasn't found
    return this.cache.replicaUpdate;
  }

  async getProcess(): Promise<AnnotatedProcess | undefined> {
    // if we have already gotten the event,
    // return it without re-querying
    if (this.cache.process) {
      return this.cache.process;
    }
    // if not, attempt to query the event
    const processFilter = this.replica.filters.Process(this.messageHash);
    const processLogs = await queryAnnotatedEvents<ProcessTypes, ProcessArgs>(
      this.context,
      this.destination,
      this.replica,
      processFilter,
    );
    if (processLogs.length === 1) {
      // if event is returned, store it to the object
      this.cache.process = processLogs[0];
    } else if (processLogs.length > 1) {
      throw new Error('multiple replica process for same message');
    }
    // return the update or undefined if it doesn't exist
    return this.cache.process;
  }

  async events(): Promise<OpticsStatus> {
    const events: AnnotatedLifecycleEvent[] = [this.dispatch];
    // attempt to get Home update
    const homeUpdate = await this.getHomeUpdate();
    if (!homeUpdate) {
      return {
        status: MessageStatus.Dispatched, // the message has been sent; nothing more
        events,
      };
    }
    events.push(homeUpdate);
    // attempt to get Replica update
    const replicaUpdate = await this.getReplicaUpdate();
    if (!replicaUpdate) {
      return {
        status: MessageStatus.Included, // the message was sent, then included in an Update on Home
        events,
      };
    }
    events.push(replicaUpdate);
    // attempt to get Replica process
    const process = await this.getProcess();
    if (!process) {
      // NOTE: when this is the status, you may way to
      // query confirmAt() to check if challenge period
      // on the Replica has elapsed or not
      return {
        status: MessageStatus.Relayed, // the message was sent, included in an Update, then relayed to the Replica
        events,
      };
    }
    events.push(process);
    return {
      status: MessageStatus.Processed, // the message was processed
      events,
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
    const update = await this.getHomeUpdate();
    if (!update) {
      return BigNumber.from(0);
    }
    const { newRoot } = update.event.args;
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
    return this.dispatch.event.transactionHash;
  }

  get messageHash(): string {
    return this.dispatch.event.args.messageHash;
  }

  get leafIndex(): BigNumber {
    return this.dispatch.event.args.leafIndex;
  }

  get destinationAndNonce(): BigNumber {
    return this.dispatch.event.args.destinationAndNonce;
  }

  get committedRoot(): string {
    return this.dispatch.event.args.committedRoot;
  }
}

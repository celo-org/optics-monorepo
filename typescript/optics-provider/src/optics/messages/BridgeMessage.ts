import { BigNumber } from '@ethersproject/bignumber';
import { arrayify, hexlify } from '@ethersproject/bytes';
import { TransactionReceipt } from '@ethersproject/abstract-provider';
import { ethers } from 'ethers';
import { xapps } from '@optics-xyz/ts-interface';
import { BridgeContracts, OpticsContext } from '..';
import { ResolvedTokenInfo, TokenIdentifier } from '../tokens';
import { OpticsMessage } from './OpticsMessage';
import { AnnotatedDispatch } from '../events/opticsEvents';

const ACTION_LEN = {
  identifier: 1,
  tokenId: 36,
  transfer: 65,
  details: 66,
  requestDetails: 1,
};

type Transfer = {
  type: 'transfer';
  to: string;
  amount: BigNumber;
};

export type Details = {
  type: 'details';
  name: string;
  symbol: string;
  decimals: number;
};

export type RequestDetails = { type: 'requestDetails' };

export type Action = Transfer | Details | RequestDetails;

export type ParsedBridgeMessage<T extends Action> = {
  token: TokenIdentifier;
  action: T;
};

export type AnyBridgeMessage =
  | TransferMessage
  | DetailsMessage
  | RequestDetailsMessage;
export type ParsedTransferMessage = ParsedBridgeMessage<Transfer>;
export type ParsedDetailsMessage = ParsedBridgeMessage<Details>;
export type ParsedRequestDetailsMesasage = ParsedBridgeMessage<RequestDetails>;

function parseAction(buf: Uint8Array): Action {
  if (buf.length === ACTION_LEN.requestDetails) {
    return { type: 'requestDetails' };
  }

  // Transfer
  if (buf.length === ACTION_LEN.transfer) {
    // trim identifer
    buf = buf.slice(ACTION_LEN.identifier);
    return {
      type: 'transfer',
      to: hexlify(buf.slice(0, 32)),
      amount: BigNumber.from(hexlify(buf.slice(32))),
    };
  }

  // Details
  if (buf.length === ACTION_LEN.details) {
    // trim identifer
    buf = buf.slice(ACTION_LEN.identifier);
    // TODO(james): improve this to show real strings
    return {
      type: 'details',
      name: hexlify(buf.slice(0, 32)),
      symbol: hexlify(buf.slice(32, 64)),
      decimals: buf[64],
    };
  }

  throw new Error('Bad action');
}

function parseBody(
  messageBody: string,
): ParsedTransferMessage | ParsedDetailsMessage | ParsedRequestDetailsMesasage {
  const buf = arrayify(messageBody);

  const tokenId = buf.slice(0, 36);
  const token = {
    domain: Buffer.from(tokenId).readUInt32BE(0),
    id: hexlify(tokenId.slice(4, 36)),
  };

  const action = parseAction(buf.slice(36));
  const parsedMessage = {
    action,
    token,
  };

  switch (action.type) {
    case 'transfer':
      return parsedMessage as ParsedTransferMessage;
    case 'details':
      return parsedMessage as ParsedDetailsMessage;
    case 'requestDetails':
      return parsedMessage as ParsedRequestDetailsMesasage;
  }
}

/**
 * The BridgeMessage extends {@link OpticsMessage} with Bridge-specific
 * functionality.
 */
class BridgeMessage extends OpticsMessage {
  readonly token: TokenIdentifier;
  readonly fromBridge: BridgeContracts;
  readonly toBridge: BridgeContracts;

  /**
   * @hideconstructor
   */
  constructor(
    context: OpticsContext,
    event: AnnotatedDispatch,
    token: TokenIdentifier,
    callerKnowsWhatTheyAreDoing: boolean,
  ) {
    if (!callerKnowsWhatTheyAreDoing) {
      throw new Error('Use `fromReceipt` to instantiate');
    }
    super(context, event);

    const fromBridge = context.mustGetBridge(this.message.from);
    const toBridge = context.mustGetBridge(this.message.destination);

    this.fromBridge = fromBridge;
    this.toBridge = toBridge;
    this.token = token;
  }

  /**
   * Attempt to instantiate a BridgeMessage from an existing
   * {@link OpticsMessage}
   *
   * @param context The {@link OpticsContext} to use.
   * @param opticsMessage The existing OpticsMessage
   * @returns A Bridge message
   * @throws if the message cannot be parsed as a bridge message
   */
  static fromOpticsMessage(
    context: OpticsContext,
    opticsMessage: OpticsMessage,
  ): AnyBridgeMessage {
    const parsedMessageBody = parseBody(opticsMessage.message.body);

    switch (parsedMessageBody.action.type) {
      case 'transfer':
        return new TransferMessage(
          context,
          opticsMessage.dispatch,
          parsedMessageBody as ParsedTransferMessage,
        );
      case 'details':
        return new DetailsMessage(
          context,
          opticsMessage.dispatch,
          parsedMessageBody as ParsedDetailsMessage,
        );
      case 'requestDetails':
        return new RequestDetailsMessage(
          context,
          opticsMessage.dispatch,
          parsedMessageBody as ParsedRequestDetailsMesasage,
        );
    }
  }

  /**
   * Attempt to instantiate some BridgeMessages from a transaction receipt
   *
   * @param context The {@link OpticsContext} to use.
   * @param nameOrDomain the domain on which the receipt was logged
   * @param receipt The receipt
   * @returns an array of {@link BridgeMessage} objects
   * @throws if any message cannot be parsed as a bridge message
   */
  static fromReceipt(
    context: OpticsContext,
    nameOrDomain: string | number,
    receipt: TransactionReceipt,
  ): AnyBridgeMessage[] {
    const opticsMessages: OpticsMessage[] = OpticsMessage.fromReceipt(
      context,
      nameOrDomain,
      receipt,
    );
    const bridgeMessages: AnyBridgeMessage[] = [];
    for (const opticsMessage of opticsMessages) {
      try {
        const bridgeMessage = BridgeMessage.fromOpticsMessage(
          context,
          opticsMessage,
        );
        bridgeMessages.push(bridgeMessage);
      } catch (e) {
        // catch error if OpticsMessage isn't a BridgeMessage
      }
    }
    return bridgeMessages;
  }

  /**
   * Attempt to instantiate EXACTLY one BridgeMessage from a transaction receipt
   *
   * @param context The {@link OpticsContext} to use.
   * @param nameOrDomain the domain on which the receipt was logged
   * @param receipt The receipt
   * @returns an array of {@link BridgeMessage} objects
   * @throws if any message cannot be parsed as a bridge message, or if there
   *         is not EXACTLY 1 BridgeMessage in the receipt
   */
  static singleFromReceipt(
    context: OpticsContext,
    nameOrDomain: string | number,
    receipt: TransactionReceipt,
  ): AnyBridgeMessage {
    const messages: AnyBridgeMessage[] = BridgeMessage.fromReceipt(
      context,
      nameOrDomain,
      receipt,
    );
    if (messages.length !== 1) {
      throw new Error('Expected single Dispatch in transaction');
    }
    return messages[0];
  }

  /**
   * Attempt to instantiate some BridgeMessages from a transaction hash by
   * retrieving and parsing the receipt.
   *
   * @param context The {@link OpticsContext} to use.
   * @param nameOrDomain the domain on which the receipt was logged
   * @param transactionHash The transaction hash
   * @returns an array of {@link BridgeMessage} objects
   * @throws if any message cannot be parsed as a bridge message
   */
  static async fromTransactionHash(
    context: OpticsContext,
    nameOrDomain: string | number,
    transactionHash: string,
  ): Promise<AnyBridgeMessage[]> {
    const provider = context.mustGetProvider(nameOrDomain);
    const receipt = await provider.getTransactionReceipt(transactionHash);
    if (!receipt) {
      throw new Error(`No receipt for ${transactionHash} on ${nameOrDomain}`);
    }
    return BridgeMessage.fromReceipt(context, nameOrDomain, receipt);
  }

  /**
   * Attempt to instantiate EXACTLY one BridgeMessages from a transaction hash
   * by retrieving and parsing the receipt.
   *
   * @param context The {@link OpticsContext} to use.
   * @param nameOrDomain the domain on which the receipt was logged
   * @param transactionHash The transaction hash
   * @returns an array of {@link BridgeMessage} objects
   * @throws if any message cannot be parsed as a bridge message, or if there is
   *         not EXACTLY one such message
   */
  static async singleFromTransactionHash(
    context: OpticsContext,
    nameOrDomain: string | number,
    transactionHash: string,
  ): Promise<AnyBridgeMessage> {
    const provider = context.mustGetProvider(nameOrDomain);
    const receipt = await provider.getTransactionReceipt(transactionHash);
    if (!receipt) {
      throw new Error(`No receipt for ${transactionHash} on ${nameOrDomain}`);
    }
    return BridgeMessage.singleFromReceipt(context, nameOrDomain, receipt);
  }

  /**
   * Resolves the asset that is being transfered
   *
   * WARNING: do not hold references to these contract, as they will not be
   * reconnected in the event the chain connection changes.
   *
   * @returns The resolved token information.
   */
  async asset(): Promise<ResolvedTokenInfo> {
    return await this.context.resolveRepresentations(this.token);
  }

  /**
   * Resolves an interface for the asset that is being transfered on the chain
   * FROM WHICH it is being transferred
   *
   * WARNING: do not hold references to this contract, as it will not be
   * reconnected in the event the chain connection changes.
   *
   * @returns The resolved token interface.
   */
  async assetAtOrigin(): Promise<xapps.ERC20 | undefined> {
    return (await this.asset()).tokens.get(this.origin);
  }

  /**
   * Resolves an interface for the asset that is being transfered on the chain
   * TO WHICH it is being transferred
   *
   * WARNING: do not hold references to this contract, as it will not be
   * reconnected in the event the chain connection changes.
   *
   * @returns The resolved token interface.
   */
  async assetAtDestination(): Promise<xapps.ERC20 | undefined> {
    return (await this.asset()).tokens.get(this.destination);
  }
}

/**
 * A TransferMessage extends the {@link BridgeMessage} with transfer-specific
 * functionality.
 */
export class TransferMessage extends BridgeMessage {
  action: Transfer;

  constructor(
    context: OpticsContext,
    event: AnnotatedDispatch,
    parsed: ParsedTransferMessage,
  ) {
    super(context, event, parsed.token, true);
    this.action = parsed.action;
  }

  /**
   * Check if the transfer has been prefilled using the fast liquidity system.
   *
   * @returns true if the transfer has been prefilled. Else false.
   */
  async currentlyPrefilled(): Promise<boolean> {
    const bridge = this.context.mustGetBridge(this.destination);
    const lpAddress = await bridge.bridgeRouter.liquidityProvider(
      this.prefillId,
    );
    if (lpAddress !== ethers.constants.AddressZero) {
      return true;
    }
    return false;
  }

  /**
   * The amount of tokens being transferred (in the smallest unit)
   */
  get amount(): BigNumber {
    return this.action.amount;
  }

  /**
   * The identifier for the recipient of the tokens
   */
  get to(): string {
    return this.action.to;
  }

  /**
   * The ID used for prefilling this transfer message.
   */
  get prefillId(): string {
    return this.bodyHash;
  }
}

/**
 * A DetailsMessage extends the {@link BridgeMessage} with details-specific
 * functionality.
 */
export class DetailsMessage extends BridgeMessage {
  action: Details;

  constructor(
    context: OpticsContext,
    event: AnnotatedDispatch,
    parsed: ParsedDetailsMessage,
  ) {
    super(context, event, parsed.token, true);
    this.action = parsed.action;
  }

  /**
   * Get the token name being sent
   */
  get name(): string {
    return this.action.name;
  }

  /**
   * Get the token symbol being sent
   */
  get symbol(): string {
    return this.action.symbol;
  }

  /**
   * Get the token decimals being sent
   */
  get decimals(): number {
    return this.action.decimals;
  }
}

/**
 * A RequestDetailsMessage extends the {@link BridgeMessage} with
 * details-specific functionality.
 */
export class RequestDetailsMessage extends BridgeMessage {
  action: RequestDetails;

  constructor(
    context: OpticsContext,
    event: AnnotatedDispatch,
    parsed: ParsedRequestDetailsMesasage,
  ) {
    super(context, event, parsed.token, true);
    this.action = parsed.action;
  }
}

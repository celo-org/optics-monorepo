import { BigNumber } from '@ethersproject/bignumber';
import { arrayify, hexlify } from '@ethersproject/bytes';
import { ContractReceipt, ethers } from 'ethers';
import { BridgeContracts, OpticsContext } from '..';
import { xapps } from '@optics-xyz/ts-interface';
import { ResolvedTokenInfo, TokenIdentifier } from '../tokens';
import { OpticsMessage, parseMessage } from './OpticsMessage';

const ACTION_LEN = {
  identifier: 1,
  tokenId: 36,
  transfer: 65,
  details: 66,
  requestDetails: 1,
};

type Transfer = {
  action: 'transfer';
  to: string;
  amount: BigNumber;
};

export type Details = {
  action: 'details';
  name: string;
  symbol: string;
  decimals: number;
};

export type RequestDetails = { action: 'requestDetails' };

export type Action = Transfer | Details | RequestDetails;

export type ParsedBridgeMessage<T extends Action> = {
  token: TokenIdentifier;
  action: T;
};

export type ParsedTransferMessage = ParsedBridgeMessage<Transfer>;
export type ParsedDetailsMessage = ParsedBridgeMessage<Details>;
export type ParsedRequestDetailsMesasage = ParsedBridgeMessage<RequestDetails>;

function parseAction(buf: Uint8Array): Action {
  if (buf.length === ACTION_LEN.requestDetails) {
    return { action: 'requestDetails' };
  }

  // Transfer
  if (buf.length === ACTION_LEN.transfer) {
    // trim identifer
    buf = buf.slice(ACTION_LEN.identifier);
    return {
      action: 'transfer',
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
      action: 'details',

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
    id: hexlify(buf.slice(4)),
  };

  const action = parseAction(buf.slice(36));
  const parsedMessage = {
    action,
    token,
  };

  switch (action.action) {
    case 'transfer':
      return parsedMessage as ParsedTransferMessage;
    case 'details':
      return parsedMessage as ParsedDetailsMessage;
    case 'requestDetails':
      return parsedMessage as ParsedRequestDetailsMesasage;
  }
}

class BridgeMessage extends OpticsMessage {
  readonly token: TokenIdentifier;

  readonly fromBridge: BridgeContracts;
  readonly toBridge: BridgeContracts;

  constructor(
    receipt: ContractReceipt,
    token: TokenIdentifier,
    context: OpticsContext,
    callerKnowsWhatTheyAreDoing: boolean,
  ) {
    if (!callerKnowsWhatTheyAreDoing) {
      throw new Error('Use `fromReceipt` to instantiate');
    }
    super(receipt, context);

    const fromBridge = context.mustGetBridge(this.message.from);
    const toBridge = context.mustGetBridge(this.message.destination);

    this.fromBridge = fromBridge;
    this.toBridge = toBridge;
    this.token = token;
  }

  static fromReceipt(
    receipt: ethers.ContractReceipt,
    context: OpticsContext,
  ): TransferMessage | DetailsMessage | RequestDetailsMessage {
    // kinda hate this but ok
    const oMessage = new OpticsMessage(receipt, context);

    let event = oMessage.event;

    const parsedEvent = parseMessage(event.args.message);
    const parsed = parseBody(parsedEvent.body);

    switch (parsed.action.action) {
      case 'transfer':
        return new TransferMessage(
          receipt,
          parsed as ParsedTransferMessage,
          context,
        );
      case 'details':
        return new DetailsMessage(
          receipt,
          parsed as ParsedDetailsMessage,
          context,
        );
      case 'requestDetails':
        return new RequestDetailsMessage(
          receipt,
          parsed as ParsedRequestDetailsMesasage,
          context,
        );
    }
  }

  async asset(): Promise<ResolvedTokenInfo> {
    return await this.context.tokenRepresentations(this.token);
  }

  // Get the asset at the orgin
  async assetAtOrigin(): Promise<xapps.ERC20 | undefined> {
    return (await this.asset()).tokens.get(this.origin);
  }

  // Get the asset at the destination
  async assetAtDestination(): Promise<xapps.ERC20 | undefined> {
    return (await this.asset()).tokens.get(this.destination);
  }
}

export class TransferMessage extends BridgeMessage {
  action: Transfer;

  constructor(
    receipt: ContractReceipt,
    parsed: ParsedTransferMessage,
    context: OpticsContext,
  ) {
    super(receipt, parsed.token, context, true);
    this.action = parsed.action;
  }

  async currentlyPrefilled(): Promise<boolean> {
    const bridge = this.context.mustGetBridge(this.destination);
    const lpAddress = await bridge.bridgeRouter.liquidityProvider(
      this.messageHash,
    );
    if (lpAddress !== ethers.constants.AddressZero) {
      return true;
    }
    return false;
  }

  get amount(): BigNumber {
    return this.action.amount;
  }

  get to(): string {
    return this.action.to;
  }
}

export class DetailsMessage extends BridgeMessage {
  action: Details;

  constructor(
    receipt: ContractReceipt,
    parsed: ParsedDetailsMessage,
    context: OpticsContext,
  ) {
    super(receipt, parsed.token, context, true);
    this.action = parsed.action;
  }

  get name(): string {
    return this.action.name;
  }

  get symbol(): string {
    return this.action.symbol;
  }

  get decimals(): number {
    return this.action.decimals;
  }
}

export class RequestDetailsMessage extends BridgeMessage {
  action: RequestDetails;

  constructor(
    receipt: ContractReceipt,
    parsed: ParsedRequestDetailsMesasage,
    context: OpticsContext,
  ) {
    super(receipt, parsed.token, context, true);
    this.action = parsed.action;
  }
}

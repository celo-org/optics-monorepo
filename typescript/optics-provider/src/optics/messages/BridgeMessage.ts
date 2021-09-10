import { BigNumber } from '@ethersproject/bignumber';
import { arrayify, hexlify } from '@ethersproject/bytes';
import { BridgeContracts, CoreContracts, OpticsContext } from '..';
import { ResolvedTokenInfo, TokenIdentifier } from '../tokens';
import { DispatchEvent, OpticsMessage, parseMessage } from './OpticsMessage';

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

class BridgeMessage<T extends Action> extends OpticsMessage {
  readonly token: TokenIdentifier;
  readonly action: T;

  readonly fromBridge: BridgeContracts;
  readonly toBridge: BridgeContracts;

  constructor(
    event: DispatchEvent,
    parsed: ParsedBridgeMessage<T>,
    context: OpticsContext,
  ) {
    super(event, context);

    const fromBridge = context.getBridge(this.message.from);
    const toBridge = context.getBridge(this.message.destination);

    if (!fromBridge || !toBridge) {
      throw new Error('missing bridge');
    }

    this.fromBridge = fromBridge;
    this.toBridge = toBridge;
    this.token = parsed.token;

    this.action = parsed.action;
  }

  static fromEvent(
    event: DispatchEvent,
    context: OpticsContext,
  ): TransferMessage | DetailsMessage | RequestDetailsMesasage {
    // kinda hate this but ok
    const parsedEvent = parseMessage(event.args.message);
    const parsed = parseBody(parsedEvent.body);

    switch (parsed.action.action) {
      case 'transfer':
        return new BridgeMessage(
          event,
          parsed as ParsedTransferMessage,
          context,
        );
      case 'details':
        return new BridgeMessage(
          event,
          parsed as ParsedDetailsMessage,
          context,
        );
      case 'requestDetails':
        return new BridgeMessage(
          event,
          parsed as ParsedRequestDetailsMesasage,
          context,
        );
    }
  }

  async asset(): Promise<ResolvedTokenInfo> {
    return await this.context.tokenRepresentations(this.token);
  }
}

export type TransferMessage = BridgeMessage<Transfer>;
export type DetailsMessage = BridgeMessage<Details>;
export type RequestDetailsMesasage = BridgeMessage<RequestDetails>;

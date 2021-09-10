import { BigNumber } from '@ethersproject/bignumber';
import { arrayify, hexlify } from '@ethersproject/bytes';
import { BridgeContracts, CoreContracts, OpticsContext } from '..';
import { Home, Replica } from '../../../../typechain/optics-core';
import { BridgeRouter } from '../../../../typechain/optics-xapps';
import { TokenIdentifier } from '../tokens';
import { DispatchEvent, OpticsMessage, ParsedMessage } from './OpticsMessage';

const ACTION_LEN = {
  identifier: 1,
  tokenId: 36,
  transfer: 65,
  details: 66,
  requestDetails: 1,
};

type Transfer = {
  to: string;
  amount: BigNumber;
};

export type Details = {
  name: string;
  symbol: string;
  decimals: number;
};

export type RequestDetails = {};

export type Action = Transfer | Details | RequestDetails;

export type ParsedBridgeMessage = {
  token: TokenIdentifier;
  action: Action;
};

function parseAction(buf: Uint8Array): Action {
  if (buf.length === ACTION_LEN.requestDetails) {
    return {} as RequestDetails;
  }

  // Transfer
  if (buf.length === ACTION_LEN.transfer) {
    // trim identifer
    buf = buf.slice(ACTION_LEN.identifier);
    return {
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
      name: hexlify(buf.slice(0, 32)),
      symbol: hexlify(buf.slice(32, 64)),
      decimals: buf[64],
    };
  }

  throw new Error('Bad action');
}

function parseBody(messageBody: string): ParsedBridgeMessage {
  const buf = arrayify(messageBody);

  const tokenId = buf.slice(0, 36);
  const action = buf.slice(36);

  return {
    action: parseAction(action),
    token: {
      domain: Buffer.from(tokenId).readUInt32BE(0),
      id: hexlify(buf.slice(4)),
    },
  };
}

export class BridgeMessage extends OpticsMessage {
  readonly action: Action;
  readonly token: TokenIdentifier;

  readonly fromBridge: BridgeContracts;
  readonly toBridge: BridgeContracts;

  constructor(event: DispatchEvent, context: OpticsContext) {
    super(event, context);
    const parsed = parseBody(this.body);

    const fromBridge = context.getBridge(this.message.from);
    const toBridge = context.getBridge(this.message.destination);

    if (!fromBridge || !toBridge) {
      throw new Error('missing bridge');
    }

    this.fromBridge = fromBridge;
    this.toBridge = toBridge;
    this.action = parsed.action;
    this.token = parsed.token;
  }
}

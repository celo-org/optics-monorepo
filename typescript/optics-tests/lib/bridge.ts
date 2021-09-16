import { TokenIdentifier } from '@optics-xyz/multi-provider/dist/optics';
import { assert } from 'chai';
import { ethers } from 'ethers';

import * as types from './types';

export enum BridgeMessageTypes {
  INVALID = 0,
  TOKEN_ID,
  MESSAGE,
  TRANSFER,
  DETAILS,
  REQUEST_DETAILS,
}

const typeToByte = (type: number): string => `0x0${type}`;

const MESSAGE_LEN = {
  identifier: 1,
  tokenId: 36,
  transfer: 65,
  details: 66,
  requestDetails: 1,
};

// Formats Transfer Message
export function formatTransfer(
  to: ethers.BytesLike,
  amnt: number | ethers.BytesLike,
): ethers.BytesLike {
  return ethers.utils.solidityPack(
    ['bytes1', 'bytes32', 'uint256'],
    [BridgeMessageTypes.TRANSFER, to, amnt],
  );
}

// Formats Details Message
export function formatDetails(
  name: string,
  symbol: string,
  decimals: number,
): ethers.BytesLike {
  return ethers.utils.solidityPack(
    ['bytes1', 'bytes32', 'bytes32', 'uint8'],
    [BridgeMessageTypes.DETAILS, name, symbol, decimals],
  );
}

// Formats Request Details message
export function formatRequestDetails(): ethers.BytesLike {
  return ethers.utils.solidityPack(
    ['bytes1'],
    [BridgeMessageTypes.REQUEST_DETAILS],
  );
}

// Formats the Token ID
export function formatTokenId(domain: number, id: string): ethers.BytesLike {
  return ethers.utils.solidityPack(['uint32', 'bytes32'], [domain, id]);
}

export function formatMessage(
  tokenId: ethers.BytesLike,
  action: ethers.BytesLike,
): ethers.BytesLike {
  return ethers.utils.solidityPack(['bytes', 'bytes'], [tokenId, action]);
}

export function serializeTransferAction(
  transferAction: types.TransferAction,
): ethers.BytesLike {
  const { type, recipient, amount } = transferAction;

  assert(type === BridgeMessageTypes.TRANSFER);
  return formatTransfer(recipient, amount);
}

export function serializeDetailsAction(
  detailsAction: types.DetailsAction,
): ethers.BytesLike {
  const { type, name, symbol, decimals } = detailsAction;

  assert(type === BridgeMessageTypes.DETAILS);
  return formatDetails(name, symbol, decimals);
}

export function serializeRequestDetailsAction(
  requestDetailsAction: types.RequestDetailsAction,
): ethers.BytesLike {
  assert(requestDetailsAction.type === BridgeMessageTypes.REQUEST_DETAILS);
  return formatRequestDetails();
}

export function serializeAction(action: types.Action): ethers.BytesLike {
  let actionBytes: ethers.BytesLike = [];
  switch (action.type) {
    case BridgeMessageTypes.TRANSFER: {
      actionBytes = serializeTransferAction(action);
      break;
    }
    case BridgeMessageTypes.DETAILS: {
      actionBytes = serializeDetailsAction(action);
      break;
    }
    case BridgeMessageTypes.REQUEST_DETAILS: {
      actionBytes = serializeRequestDetailsAction(action);
      break;
    }
    default: {
      console.error('Invalid action');
      break;
    }
  }
  return actionBytes;
}

export function serializeTokenId(tokenId: TokenIdentifier): ethers.BytesLike {
  if (typeof tokenId.domain !== 'number' || typeof tokenId.id !== 'string') {
    throw new Error('!types');
  }
  return formatTokenId(tokenId.domain as number, tokenId.id as string);
}

export function serializeMessage(message: types.Message): ethers.BytesLike {
  const tokenId = serializeTokenId(message.tokenId);
  const action = serializeAction(message.action);
  return formatMessage(tokenId, action);
}

export const bridge: types.HardhatBridgeHelpers = {
  BridgeMessageTypes,
  typeToByte,
  MESSAGE_LEN,
  serializeTransferAction,
  serializeDetailsAction,
  serializeRequestDetailsAction,
  serializeAction,
  serializeTokenId,
  serializeMessage,
};

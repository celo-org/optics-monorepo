import { assert } from 'chai';
import { ethers } from 'ethers';

import { HardhatBridgeHelpers, TransferAction, DetailsAction, RequestDetailsAction } from './types';

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
  requestDetails: 1
}

// Formats Transfer Message
export function formatTransfer(to: string, amnt: number): ethers.BytesLike {
  return ethers.utils.solidityPack(
    ['bytes1', 'bytes32', 'uint256'],
    [BridgeMessageTypes.TRANSFER, to, amnt]
  );
}

// Formats Details Message
export function formatDetails(name: string, symbol: string, decimals: number): ethers.BytesLike {
  return ethers.utils.solidityPack(
    ['bytes1', 'bytes32', 'bytes32', 'uint8'],
    [BridgeMessageTypes.DETAILS, name, symbol, decimals]
  );
}

// Formats Request Details message
export function formatRequestDetails(): ethers.BytesLike {
  return ethers.utils.solidityPack(['bytes1'], [BridgeMessageTypes.REQUEST_DETAILS]);
}

// Formats the Token ID
export function formatTokenId(domain: number, id: string): ethers.BytesLike {
  return ethers.utils.solidityPack(['uint32', 'bytes32'], [domain, id]);
}

export function formatMessage(tokenId: string, action: string): ethers.BytesLike {
  return ethers.utils.solidityPack(['bytes', 'bytes'], [tokenId, action]);
}

export function serializeTransferAction(transferAction: TransferAction): ethers.BytesLike {
  const { type, recipient, amount } = transferAction;

  assert(type === BridgeMessageTypes.TRANSFER);
  return formatTransfer(recipient, amount);
}

export function serializeDetailsAction(detailsAction: DetailsAction): ethers.BytesLike {
  const { type, name, symbol, decimal } = detailsAction;

  assert(type === BridgeMessageTypes.DETAILS);
  return formatDetails(name, symbol, decimal);
}

export function serializeRequestDetailsAction(requestDetailsAction: RequestDetailsAction): ethers.BytesLike {
  assert(requestDetailsAction.type === BridgeMessageTypes.REQUEST_DETAILS);
  return formatRequestDetails();
}

export const bridge: HardhatBridgeHelpers = {
  BridgeMessageTypes,
  typeToByte,
  MESSAGE_LEN,
  formatTransfer,
  formatDetails,
  formatRequestDetails,
  formatTokenId,
  formatMessage
}
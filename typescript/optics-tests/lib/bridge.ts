import { ethers } from 'ethers';

import { HardhatBridgeHelpers } from './types';

export enum BridgeMessageTypes {
  INVALID = 0,
  TOKEN_ID,
  MESSAGE,
  TRANSFER,
  DETAILS,
  REQUEST_DETAILS,
}

const typeToByte = (type: number) => `0x0${type}`;

const MESSAGE_LEN = {
  identifier: 1,
  tokenId: 36,
  transfer: 65,
  details: 66,
  requestDetails: 1
}

// Formats Transfer Message
export function formatTransfer(to: string, amnt: number) {
  return ethers.utils.solidityPack(
    ['bytes1', 'bytes32', 'uint256'],
    [BridgeMessageTypes.TRANSFER, to, amnt]
  );
}

// Formats Details Message
export function formatDetails(name: string, symbol: string, decimals: number) {
  return ethers.utils.solidityPack(
    ['bytes1', 'bytes32', 'bytes32', 'uint8'],
    [BridgeMessageTypes.DETAILS, name, symbol, decimals]
  );
}

// Formats Request Details message
export function formatRequestDetails() {
  return ethers.utils.solidityPack(['bytes1'], [BridgeMessageTypes.REQUEST_DETAILS]);
}

// Formats the Token ID
export function formatTokenId(domain: number, id: string) {
  return ethers.utils.solidityPack(['uint32', 'bytes32'], [domain, id]);
}

export const bridge: HardhatBridgeHelpers = {
  BridgeMessageTypes,
  typeToByte,
  MESSAGE_LEN,
  formatTransfer,
  formatDetails,
  formatRequestDetails,
  formatTokenId
}
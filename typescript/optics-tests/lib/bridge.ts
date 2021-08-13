import { ethers } from 'ethers';

export enum BridgeMessageTypes {
  INVALID = 0,
  TOKEN_ID,
  MESSAGE,
  TRANSFER,
  DETAILS,
  REQUEST_DETAILS,
}

export const typeToBytes = (type: number) => `0x0${type}`;

const TOKEN_ID_LEN = 36; // 4 bytes domain + 32 bytes id
const IDENTIFIER_LEN = 1;
const TRANSFER_LEN = 65; // 1 byte identifier + 32 bytes recipient + 32 bytes amount
const DETAILS_LEN = 66; // 1 byte identifier + 32 bytes name + 32 bytes symbol + 1 byte decimals
const REQUEST_DETAILS_LEN = 1; // 1 byte identifier

type TransferMessage = {
  type: BridgeMessageTypes.TRANSFER;
  recipient: number;
  amount: number;
}

type DetailsMessage = {
  type: BridgeMessageTypes.DETAILS;
  name: string;
  symbol: string;
  decimal: number;
}

type RequestDetailsMessage = {
  type: BridgeMessageTypes.REQUEST_DETAILS;
}

// Formats Transfer Message
function formatTransfer(to: string, amnt: number) {
  return ethers.utils.solidityPack(
    ['bytes1', 'bytes32', 'uint256'],
    [BridgeMessageTypes.TRANSFER, to, amnt]
  );
}

// Formats Details Message
function formatDetails(name: string, symbol: string, decimals: number) {
  return ethers.utils.solidityPack(
    ['bytes1', 'bytes32', 'bytes32', 'uint8'],
    [BridgeMessageTypes.DETAILS, name, symbol, decimals]
  );
}

// Formats Request Details message
function formatRequestDetails() {
  return ethers.utils.solidityPack(['bytes1'], [BridgeMessageTypes.REQUEST_DETAILS]);
}

// Formats the Token ID
function formatTokenId(domain: number, id: string) {
  return ethers.utils.solidityPack(['uint32', 'bytes32'], [domain, id]);
}

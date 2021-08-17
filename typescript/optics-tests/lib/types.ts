import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BytesLike } from 'ethers';
import { BridgeMessageTypes } from './bridge';

/********* HRE *********/

export interface HardhatOpticsHelpers {
  formatMessage: Function;
  governance: {
    formatTransferGovernor: Function;
    formatSetRouter: Function;
    formatCalls: Function;
  };
  messageToLeaf: Function;
  ethersAddressToBytes32: Function;
  destinationAndSequence: Function;
  domainHash: Function;
  signedFailureNotification: Function;
}

export interface HardhatBridgeHelpers {
  BridgeMessageTypes: typeof BridgeMessageTypes;
  typeToByte: Function;
  MESSAGE_LEN: MessageLen;
  formatTransfer: Function;
  formatDetails: Function;
  formatRequestDetails: Function;
  formatTokenId: Function;
  formatMessage: Function;
}

declare module 'hardhat/types/runtime' {
  interface HardhatRuntimeEnvironment {
    optics: HardhatOpticsHelpers;
    bridge: HardhatBridgeHelpers;
  }
}

/********* BASIC TYPES *********/
export type Domain = number;
export type Address = string;
export type AddressBytes32 = string;
export type HexString = string;
export type Signer = SignerWithAddress;
export type BytesArray = [
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
  BytesLike,
];

/********* OPTICS CORE *********/
export type Update = {
  oldRoot: string;
  newRoot: string;
  signature: string;
};

export type CallData = {
  to: Address;
  data: string;
};

export type FailureNotification = {
  domainCommitment: string;
  domain: number;
  updaterBytes32: string;
};

export type SignedFailureNotification = {
  failureNotification: FailureNotification;
  signature: string;
};

/********* TOKEN BRIDGE *********/

export type MessageLen = {
  identifier: number;
  tokenId: number;
  transfer: number;
  details: number;
  requestDetails: number;
}

export type TransferMessage = {
  type: BridgeMessageTypes.TRANSFER;
  recipient: number;
  amount: number;
}

export type DetailsMessage = {
  type: BridgeMessageTypes.DETAILS;
  name: string;
  symbol: string;
  decimal: number;
}

export type RequestDetailsMessage = {
  type: BridgeMessageTypes.REQUEST_DETAILS;
}

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BytesLike, ethers } from 'ethers';
import { BridgeMessageTypes } from './bridge';

/********* HRE *********/

export interface HardhatOpticsHelpers {
  formatMessage: Function;
  governance: {
    formatTransferGovernor: Function;
    formatSetRouter: Function;
    formatCalls: Function;
  };
  messageHash: Function;
  ethersAddressToBytes32: Function;
  destinationAndNonce: Function;
  domainHash: Function;
  signedFailureNotification: Function;
}

export interface HardhatBridgeHelpers {
  BridgeMessageTypes: typeof BridgeMessageTypes;
  typeToByte: Function;
  MESSAGE_LEN: MessageLen;
  serializeTransferAction: Function;
  serializeDetailsAction: Function;
  serializeRequestDetailsAction: Function;
  serializeAction: Function;
  serializeTokenId: Function;
  serializeMessage: Function;
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

export type Action = DetailsAction | TransferAction | RequestDetailsAction;

export type TokenId = {
  domain: number;
  id: string;
}
export type Message = {
  tokenId: TokenId;
  action: Action;
}

export type TransferAction = {
  type: BridgeMessageTypes.TRANSFER;
  recipient: ethers.BytesLike;
  amount: number | ethers.BytesLike;
}

export type DetailsAction = {
  type: BridgeMessageTypes.DETAILS;
  name: string;
  symbol: string;
  decimals: number;
}

export type RequestDetailsAction = {
  type: BridgeMessageTypes.REQUEST_DETAILS;
}

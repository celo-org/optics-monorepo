import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BytesLike } from 'ethers';

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

declare module 'hardhat/types/runtime' {
  interface HardhatRuntimeEnvironment {
    optics: HardhatOpticsHelpers;
  }
}

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

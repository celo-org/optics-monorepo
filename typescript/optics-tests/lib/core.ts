import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { assert } from 'chai';
import * as ethers from 'ethers';

import * as types from './types';
import { getHexStringByteLength } from './utils';

export class Updater {
  localDomain: types.Domain;
  signer: SignerWithAddress;
  address: types.Address;

  constructor(
    signer: SignerWithAddress,
    address: types.Address,
    localDomain: types.Domain,
    disableWarn: boolean,
  ) {
    if (!disableWarn) {
      throw new Error('Please use `Updater.fromSigner()` to instantiate.');
    }
    this.localDomain = localDomain ? localDomain : 0;
    this.signer = signer;
    this.address = address;
  }

  static async fromSigner(
    signer: SignerWithAddress,
    localDomain: types.Domain,
  ) {
    return new Updater(signer, await signer.getAddress(), localDomain, true);
  }

  domainHash() {
    return domainHash(this.localDomain);
  }

  message(oldRoot: types.HexString, newRoot: types.HexString) {
    return ethers.utils.concat([this.domainHash(), oldRoot, newRoot]);
  }

  async signUpdate(oldRoot: types.HexString, newRoot: types.HexString) {
    let message = this.message(oldRoot, newRoot);
    let msgHash = ethers.utils.arrayify(ethers.utils.keccak256(message));
    let signature = await this.signer.signMessage(msgHash);
    return {
      origin: this.localDomain,
      oldRoot,
      newRoot,
      signature,
    };
  }
}

const formatMessage = (
  localDomain: types.Domain,
  senderAddr: types.Address,
  sequence: number,
  destinationDomain: types.Domain,
  recipientAddr: types.Address,
  body: types.HexString,
): string => {
  senderAddr = ethersAddressToBytes32(senderAddr);
  recipientAddr = ethersAddressToBytes32(recipientAddr);

  return ethers.utils.solidityPack(
    ['uint32', 'bytes32', 'uint32', 'uint32', 'bytes32', 'bytes'],
    [localDomain, senderAddr, sequence, destinationDomain, recipientAddr, body],
  );
};

export enum OpticsState {
  UNINITIALIZED = 0,
  ACTIVE,
  FAILED,
}

export enum GovernanceMessage {
  CALL = 1,
  TRANSFERGOVERNOR = 2,
  SETROUTER = 3,
}

export enum MessageStatus {
  NONE = 0,
  PENDING,
  PROCESSED,
}

function formatTransferGovernor(
  newDomain: types.Domain,
  newAddress: types.Address,
): string {
  return ethers.utils.solidityPack(
    ['bytes1', 'uint32', 'bytes32'],
    [GovernanceMessage.TRANSFERGOVERNOR, newDomain, newAddress],
  );
}

function formatSetRouter(domain: types.Domain, address: types.Address): string {
  return ethers.utils.solidityPack(
    ['bytes1', 'uint32', 'bytes32'],
    [GovernanceMessage.SETROUTER, domain, address],
  );
}

function messageToLeaf(message: types.HexString): string {
  return ethers.utils.solidityKeccak256(['bytes'], [message]);
}

function ethersAddressToBytes32(address: types.Address): string {
  return ethers.utils
    .hexZeroPad(ethers.utils.hexStripZeros(address), 32)
    .toLowerCase();
}

function destinationAndSequence(
  destination: types.Domain,
  sequence: number,
): ethers.BigNumber {
  assert(destination < Math.pow(2, 32) - 1);
  assert(sequence < Math.pow(2, 32) - 1);

  return ethers.BigNumber.from(destination)
    .mul(ethers.BigNumber.from(2).pow(32))
    .add(ethers.BigNumber.from(sequence));
}

function domainHash(domain: Number): string {
  return ethers.utils.solidityKeccak256(
    ['uint32', 'string'],
    [domain, 'OPTICS'],
  );
}

async function signedFailureNotification(
  signer: ethers.Signer,
  domain: types.Domain,
  updaterAddress: types.Address,
): Promise<types.SignedFailureNotification> {
  const domainCommitment = domainHash(domain);
  const updaterBytes32 = ethersAddressToBytes32(updaterAddress);

  const failureNotification = ethers.utils.solidityPack(
    ['bytes32', 'uint32', 'bytes32'],
    [domainCommitment, domain, updaterBytes32],
  );
  const signature = await signer.signMessage(
    ethers.utils.arrayify(ethers.utils.keccak256(failureNotification)),
  );

  return {
    failureNotification: {
      domainCommitment,
      domain,
      updaterBytes32,
    },
    signature,
  };
}

function formatCalls(callsData: types.CallData[]): string {
  let callBody = '0x';
  const numCalls = callsData.length;

  for (let i = 0; i < numCalls; i++) {
    const { to, data } = callsData[i];
    const dataLen = getHexStringByteLength(data);

    if (!to || !data) {
      throw new Error(`Missing data in Call ${i + 1}: \n  ${callsData[i]}`);
    }

    let hexBytes = ethers.utils.solidityPack(
      ['bytes32', 'uint256', 'bytes'],
      [to, dataLen, data],
    );

    // remove 0x before appending
    callBody += hexBytes.slice(2);
  }

  return ethers.utils.solidityPack(
    ['bytes1', 'bytes1', 'bytes'],
    [GovernanceMessage.CALL, numCalls, callBody],
  );
}

export const optics: types.HardhatOpticsHelpers = {
  formatMessage,
  governance: {
    formatTransferGovernor,
    formatSetRouter,
    formatCalls,
  },
  messageToLeaf,
  ethersAddressToBytes32,
  destinationAndSequence,
  domainHash,
  signedFailureNotification,
};
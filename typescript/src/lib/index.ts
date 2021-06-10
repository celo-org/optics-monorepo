import '@nomiclabs/hardhat-waffle';
import { assert } from 'chai';
import { extendEnvironment } from 'hardhat/config';

import * as types from './types';
import * as deployHelpers from '../index';
import { getHexStringByteLength } from './utils';
// import * as HomeAbi from '../../../rust/optics-ethereum/abis/Home.abi.json';
// import * as ReplicaAbi from '../../../rust/optics-ethereum/abis/Replica.abi.json';

// HardhatRuntimeEnvironment
extendEnvironment((hre: any) => {
  let { ethers } = hre;
  const State = {
    UNINITIALIZED: 0,
    ACTIVE: 1,
    FAILED: 2,
  };

  const GovernanceMessage = {
    CALL: 1,
    TRANSFERGOVERNOR: 2,
    SETROUTER: 3,
  };

  const MessageStatus = {
    NONE: 0,
    PENDING: 1,
    PROCESSED: 2,
  };

  class Common extends ethers.Contract {
    constructor(address: types.Address, abi: string, providerOrSigner: string) {
      super(address, abi, providerOrSigner);
    }

    async submitDoubleUpdate(left: types.Update, right: types.Update) {
      if (left.oldRoot !== right.oldRoot) {
        throw new Error('Old roots do not match');
      }
      return await this.doubleUpdate(
        right.oldRoot,
        [left.newRoot, right.newRoot],
        left.signature,
        right.signature,
      );
    }
  }

  class Home extends Common {
    constructor(address: types.Address, providerOrSigner: string) {
      super(address, 'HomeAbi', providerOrSigner);
    }

    async submitSignedUpdate(update: types.Update) {
      return await this.update(
        update.oldRoot,
        update.newRoot,
        update.signature,
      );
    }

    // Returns list of Dispatch events with given destination and sequence
    async dispatchByDestinationAndSequence(
      destination: types.Domain,
      sequence: number,
    ) {
      const filter = this.filters.Dispatch(
        null,
        hre.optics.destinationAndSequence(destination, sequence),
      );

      return await this.queryFilter(filter);
    }
  }

  class Replica extends Common {
    constructor(address: types.Address, providerOrSigner: string) {
      super(address, 'ReplicaAbi', providerOrSigner);
    }

    async submitSignedUpdate(update: types.Update) {
      return await this.update(
        update.oldRoot,
        update.newRoot,
        update.signature,
      );
    }
  }

  class GovernanceRouter {
    static formatTransferGovernor(
      newDomain: types.Domain,
      newAddress: types.Address,
    ) {
      return ethers.utils.solidityPack(
        ['bytes1', 'uint32', 'bytes32'],
        [GovernanceMessage.TRANSFERGOVERNOR, newDomain, newAddress],
      );
    }

    static formatSetRouter(domain: types.Domain, address: types.Address) {
      return ethers.utils.solidityPack(
        ['bytes1', 'uint32', 'bytes32'],
        [GovernanceMessage.SETROUTER, domain, address],
      );
    }

    static formatCalls(callsData: types.CallData[]) {
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
  }

  class Updater {
    localDomain: types.Domain;
    signer: any;
    address: types.Address;

    constructor(
      signer: any,
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

    static async fromSigner(signer: any, localDomain: types.Domain) {
      return new Updater(signer, await signer.getAddress(), localDomain, true);
    }

    domainHash() {
      return hre.optics.domainHash(this.localDomain);
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
  ) => {
    senderAddr = hre.optics.ethersAddressToBytes32(senderAddr);
    recipientAddr = hre.optics.ethersAddressToBytes32(recipientAddr);

    return ethers.utils.solidityPack(
      ['uint32', 'bytes32', 'uint32', 'uint32', 'bytes32', 'bytes'],
      [
        localDomain,
        senderAddr,
        sequence,
        destinationDomain,
        recipientAddr,
        body,
      ],
    );
  };

  const messageToLeaf = (message: types.HexString) => {
    return ethers.utils.solidityKeccak256(['bytes'], [message]);
  };

  const ethersAddressToBytes32 = (address: types.Address) => {
    return ethers.utils
      .hexZeroPad(ethers.utils.hexStripZeros(address), 32)
      .toLowerCase();
  };

  const destinationAndSequence = (
    destination: types.Domain,
    sequence: number,
  ) => {
    assert(destination < Math.pow(2, 32) - 1);
    assert(sequence < Math.pow(2, 32) - 1);

    return ethers.BigNumber.from(destination)
      .mul(ethers.BigNumber.from(2).pow(32))
      .add(ethers.BigNumber.from(sequence));
  };

  const domainHash = (domain: Number) => {
    return ethers.utils.solidityKeccak256(
      ['uint32', 'string'],
      [domain, 'OPTICS'],
    );
  };

  const signedFailureNotification = async (
    signer: any,
    domain: types.Domain,
    updaterAddress: types.Address,
  ) => {
    const domainHash = hre.optics.domainHash(domain);
    const updaterBytes32 = hre.optics.ethersAddressToBytes32(updaterAddress);

    const failureNotification = ethers.utils.solidityPack(
      ['bytes32', 'uint32', 'bytes32'],
      [domainHash, domain, updaterBytes32],
    );
    const signature = await signer.signMessage(
      ethers.utils.arrayify(ethers.utils.keccak256(failureNotification)),
    );

    return {
      failureNotification: {
        domainHash,
        domain,
        updaterBytes32,
      },
      signature,
    };
  };

  hre.optics = {
    State,
    MessageStatus,
    Common,
    Home,
    Replica,
    GovernanceRouter,
    Updater,
    formatMessage,
    messageToLeaf,
    ethersAddressToBytes32,
    destinationAndSequence,
    domainHash,
    signedFailureNotification,
    ...deployHelpers,
  };
});

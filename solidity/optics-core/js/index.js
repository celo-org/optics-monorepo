require('@nomiclabs/hardhat-waffle');
const { assert } = require('chai');
const { extendEnvironment } = require('hardhat/config');

const {
  deployUpgradeSetup,
  deployUpgradeSetupAndProxy,
  deployImplementation,
  deployUpgradeBeaconController,
  deployProxyWithImplementation,
  getInitializeData,
} = require('./deployUpgradeSetup');
const utils = require('./utils');
const { deployOptics } = require('./deployOptics');
const HomeAbi = require('../../../rust/optics-ethereum/abis/Home.abi.json');
const ReplicaAbi = require('../../../rust/optics-ethereum/abis/Replica.abi.json');

extendEnvironment((hre) => {
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
    constructor(address, abi, providerOrSigner) {
      super(address, abi, providerOrSigner);
    }

    async submitDoubleUpdate(left, right) {
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
    constructor(address, providerOrSigner) {
      super(address, HomeAbi, providerOrSigner);
    }

    async submitSignedUpdate(update) {
      return await this.update(
        update.oldRoot,
        update.newRoot,
        update.signature,
      );
    }

    // Returns list of Dispatch events with given destination and sequence
    async dispatchByDestinationAndSequence(destination, sequence) {
      const filter = this.filters.Dispatch(
        null,
        optics.destinationAndSequence(destination, sequence),
      );

      return await this.queryFilter(filter);
    }
  }

  class Replica extends Common {
    constructor(address, providerOrSigner) {
      super(address, ReplicaAbi, providerOrSigner);
    }

    async submitSignedUpdate(update) {
      return await this.update(
        update.oldRoot,
        update.newRoot,
        update.signature,
      );
    }
  }

  class GovernanceRouter {
    static formatTransferGovernor(newDomain, newAddress) {
      return ethers.utils.solidityPack(
        ['bytes1', 'uint32', 'bytes32'],
        [GovernanceMessage.TRANSFERGOVERNOR, newDomain, newAddress],
      );
    }

    static formatSetRouter(domain, address) {
      return ethers.utils.solidityPack(
        ['bytes1', 'uint32', 'bytes32'],
        [GovernanceMessage.SETROUTER, domain, address],
      );
    }

    static formatCalls(callsData) {
      let callBody = '0x';
      const numCalls = callsData.length;

      for (let i = 0; i < numCalls; i++) {
        const { to, data } = callsData[i];
        const dataLen = utils.getHexStringByteLength(data);

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
    constructor(signer, address, localDomain, disableWarn) {
      if (!disableWarn) {
        throw new Error('Please use `Updater.fromSigner()` to instantiate.');
      }
      this.localDomain = localDomain ? localDomain : 0;
      this.signer = signer;
      this.address = address;
    }

    static async fromSigner(signer, localDomain) {
      return new Updater(signer, await signer.getAddress(), localDomain, true);
    }

    domainHash() {
      return optics.domainHash(this.localDomain);
    }

    message(oldRoot, newRoot) {
      return ethers.utils.concat([this.domainHash(), oldRoot, newRoot]);
    }

    async signUpdate(oldRoot, newRoot) {
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
    localDomain,
    senderAddr,
    sequence,
    destinationDomain,
    recipientAddr,
    body,
  ) => {
    senderAddr = optics.ethersAddressToBytes32(senderAddr);
    recipientAddr = optics.ethersAddressToBytes32(recipientAddr);

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

  const messageToLeaf = (message) => {
    return ethers.utils.solidityKeccak256(['bytes'], [message]);
  };

  const ethersAddressToBytes32 = (address) => {
    return ethers.utils
      .hexZeroPad(ethers.utils.hexStripZeros(address), 32)
      .toLowerCase();
  };

  const destinationAndSequence = (destination, sequence) => {
    assert(destination < Math.pow(2, 32) - 1);
    assert(sequence < Math.pow(2, 32) - 1);

    return ethers.BigNumber.from(destination)
      .mul(ethers.BigNumber.from(2).pow(32))
      .add(ethers.BigNumber.from(sequence));
  };

  const domainHash = (domain) => {
    return ethers.utils.solidityKeccak256(
      ['uint32', 'string'],
      [domain, 'OPTICS'],
    );
  };

  const signedFailureNotification = async (signer, domain, updaterAddress) => {
    const domainHash = optics.domainHash(domain);
    const updaterBytes32 = optics.ethersAddressToBytes32(updaterAddress);

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
    deployUpgradeSetupAndProxy,
    deployImplementation,
    deployUpgradeBeaconController,
    deployUpgradeSetup,
    deployOptics,
    deployProxyWithImplementation,
    getInitializeData,
  };
});

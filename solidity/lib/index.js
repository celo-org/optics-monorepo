require('@nomiclabs/hardhat-waffle');
const ethers = require('ethers');
const { extendEnvironment } = require('hardhat/config');

const HomeAbi = require('./Home.abi.json');
const ReplicaAbi = require('./ProcessingReplica.abi.json');

extendEnvironment((hre) => {
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

  class Updater {
    constructor(signer, address, originSlip44, disableWarn) {
      if (!disableWarn) {
        throw new Error('Please use `Updater.fromSigner()` to instantiate.');
      }
      this.originSlip44 = originSlip44 ? originSlip44 : 0;
      this.signer = signer;
      this.address = address;
    }

    static async fromSigner(signer, originSlip44) {
      return new Updater(signer, await signer.getAddress(), originSlip44, true);
    }

    domain() {
      return ethers.utils.solidityKeccak256(
        ['uint32', 'string'],
        [this.originSlip44, 'OPTICS'],
      );
    }

    message(oldRoot, newRoot) {
      return ethers.utils.concat([this.domain(), oldRoot, newRoot]);
    }

    async signUpdate(oldRoot, newRoot) {
      let message = this.message(oldRoot, newRoot);
      let msgHash = ethers.utils.arrayify(ethers.utils.keccak256(message));
      let signature = await this.signer.signMessage(msgHash);
      return {
        origin: this.originSlip44,
        oldRoot,
        newRoot,
        signature,
      };
    }
  }

  const getHomeFactory = async (...args) =>
    ethers.getContractFactory('Home', ...args);
  const getReplicaFactory = async (...args) =>
    ethers.getContractFactory('ProcessingReplica', ...args);

  const formatMessage = (
    originSlip44,
    senderAddr,
    sequence,
    destinationSlip44,
    recipientAddr,
    body,
  ) => {
    senderAddr = optics.ethersAddressToBytes32(senderAddr);
    recipientAddr = optics.ethersAddressToBytes32(recipientAddr);

    return ethers.utils.solidityPack(
      ['uint32', 'bytes32', 'uint32', 'uint32', 'bytes32', 'bytes'],
      [
        originSlip44,
        senderAddr,
        sequence,
        destinationSlip44,
        recipientAddr,
        body,
      ],
    );
  };

  const ethersAddressToBytes32 = (address) => {
    return ethers.utils.hexZeroPad(ethers.utils.hexStripZeros(address), 32);
  };

  const increaseTimestampBy = async (provider, increaseTime) => {
    await provider.send('evm_increaseTime', [increaseTime]);
    await provider.send('evm_mine');
  };

  hre.optics = {
    Common,
    Home,
    Replica,
    Updater,
    formatMessage,
    ethersAddressToBytes32,
    increaseTimestampBy,
    getHomeFactory,
    getReplicaFactory,
    deployHome: async (signer, ...args) => {
      let contract = await (await getHomeFactory(signer)).deploy(...args);
      await contract.deployed();
      return new Home(contract.address, signer);
    },
    deployReplica: async (signer, ...args) => {
      let contract = await (await getReplicaFactory(signer)).deploy(...args);
      await contract.deployed();
      return new Replica(contract.address, signer);
    },
  };
});

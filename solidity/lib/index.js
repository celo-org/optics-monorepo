require('@nomiclabs/hardhat-waffle');
const { extendEnvironment } = require('hardhat/config');

const HomeAbi = require('../artifacts/contracts/Home.sol/Home.json').abi;
const ReplicaAbi = require('../artifacts/contracts/Replica.sol/ProcessingReplica.json')
  .abi;

extendEnvironment((hre) => {
  const { ethers } = hre;
  class Common extends ethers.Contract {
    constructor(address, abi, providerOrSigner) {
      super(address, abi, providerOrSigner);
    }
  }

  class Home extends Common {
    constructor(address, providerOrSigner) {
      super(address, HomeAbi, providerOrSigner);
    }
  }

  class Replica extends Common {
    constructor(address, providerOrSigner) {
      super(address, ReplicaAbi, providerOrSigner);
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

    async static fromSigner(signer, originSlip44) {
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
      let signature = await this.signer.signMessage(message);
      return {
        origin: this.originSlip44,
        newRoot,
        oldRoot,
        signature,
      };
    }
  }

  const getHomeFactory = async () => ethers.getContractFactory('Home');
  const getReplicaFactory = async () =>
    ethers.getContractFactory('ProcessingReplica');

  hre.optics = {
    Home,
    Replica,
    Updater,
    getHomeFactory,
    getReplicaFactory,
    deployHome: async (...args) => {
      let contract = await (await getHomeFactory()).deploy(...args);
      await contract.deployed();
      return new Home(contract.address, contract.signer);
    },
    deployReplica: async (...args) => {
      let contract = await (await getReplicaFactory()).deploy(...args);
      await contract.deployed();
      return new Replica(contract.address, contract.signer);
    },
  };
});

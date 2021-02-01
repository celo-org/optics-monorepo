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
    constructor(signer, originSlip44) {
      this.originSlip44 = originSlip44 ? originSlip44 : 0;
      this.signer = signer;
    }

    domain() {
      return ethers.utils.solidityKeccak256(
        ['uint32', 'string'],
        [this.originSlip44, 'OPTICS'],
      );
    }

    async signUpdate(oldRoot, newRoot) {
      let message = ethers.utils.concat([this.domain(), oldRoot, newRoot]);
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

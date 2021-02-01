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

  const getHomeFactory = async () => ethers.getContractFactory('Home');
  const getReplicaFactory = async () =>
    ethers.getContractFactory('ProcessingReplica');

  hre.optics = {
    Home,
    Replica,
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

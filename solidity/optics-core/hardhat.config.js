require('hardhat-gas-reporter');
require('solidity-coverage');
require('@typechain/hardhat');
require('@nomiclabs/hardhat-etherscan');
const dotenv = require('dotenv');
dotenv.config();
require('./js');
const {verifyLatestCoreDeploy} = require("./js/verifyLatestDeploy");

task("verify-latest-deploy", "Verifies the source code of the latest contract deploy").setAction(verifyLatestCoreDeploy);

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: '0.7.6',
    settings: {
      optimizer: {
        enabled: true,
        runs: 999999,
      },
    },
  },

  gasReporter: {
    currency: 'USD',
  },

  networks: {
    localhost: {
      url: 'http://localhost:8545',
    },
    goerli: {
      url: 'https://goerli.infura.io/v3/5c456d7844fa40a683e934df60534c60',
    },
    kovan: {
      url: 'https://kovan.infura.io/v3/5c456d7844fa40a683e934df60534c60',
    },
  },
  typechain: {
    outDir: '../../typescript/src/typechain/optics-core',
    target: 'ethers-v5',
    alwaysGenerateOverloads: false, // should overloads with full signatures like deposit(uint256) be generated always, even if there are no overloads?
  },
  mocha: {
    bail: true,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};

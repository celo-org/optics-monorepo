require('hardhat-gas-reporter');
require('solidity-coverage');
require('@typechain/hardhat');
require('@nomiclabs/hardhat-etherscan');
const path = require('path');
const envy = require('envy');
require('./js');
const {verifyLatestDeploy} = require("./js/verifyLatestDeploy");

/*
* envy loads variables from .env and
* creates an object with camelCase properties.
* Docs: https://www.npmjs.com/package/envy
* */
let env = {};
try {
  env = envy();
} catch (e) {
  // if envy doesn't find a .env file, we swallow the error and
  // return an empty object
}

task("verify-latest-deploy", "Verifies the source code of the latest contract deploy").setAction(verifyLatestDeploy);

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
    apiKey: env.etherscanApiKey
  }
};

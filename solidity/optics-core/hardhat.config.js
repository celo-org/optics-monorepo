require('hardhat-gas-reporter');
require('solidity-coverage');

require('@typechain/hardhat');
require('@nomiclabs/hardhat-etherscan');

require('./lib');
require('./scripts');

const path = require('path');

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
  },
  typechain: {
    outDir: '../../typescript/src/typechain',
    target: 'ethers-v5',
    alwaysGenerateOverloads: false, // should overloads with full signatures like deposit(uint256) be generated always, even if there are no overloads?
  },
};

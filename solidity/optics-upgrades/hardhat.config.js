require('hardhat-gas-reporter');
require('solidity-coverage');
require('@nomiclabs/hardhat-waffle');

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
  },
};

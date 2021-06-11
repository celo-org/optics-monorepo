require('hardhat-gas-reporter');
require('solidity-coverage');
require('@nomiclabs/hardhat-waffle');
require('@typechain/hardhat');

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

  typechain: {
    outDir: '../../typescript/src/typechain/optics-xapps',
    target: 'ethers-v5',
    alwaysGenerateOverloads: false, // should overloads with full signatures like deposit(uint256) be generated always, even if there are no overloads?
  },
};

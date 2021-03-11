require('hardhat-gas-reporter');
require('solidity-coverage');

require('./lib');
require('./scripts');

const path = require('path');
require('dotenv').config({
  path: path.resolve(process.cwd(), '../../.madison.env'),
});

const {
  MADISON_RPC_USER,
  MADISON_RPC_PASS,
  MADISON_RPC_URL,
  MADISON_PRIVKEY,
} = process.env;

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
    madison: {
      chainId: 29739,
      url: `http://${MADISON_RPC_USER}:${MADISON_RPC_PASS}@${MADISON_RPC_URL}`,
      accounts: [MADISON_PRIVKEY],
    },
  },
};

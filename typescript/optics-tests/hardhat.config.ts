require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-etherscan');
require('./lib/index');

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.7.6",
    settings: {
      optimizer: {
        enabled: true,
        runs: 999999,
      },
    },
  },

  networks: {
    localhost: {
      url: "http://localhost:8545",
    },
    goerli: {
      url: "https://goerli.infura.io/v3/5c456d7844fa40a683e934df60534c60",
    },
    kovan: {
      url: "https://kovan.infura.io/v3/5c456d7844fa40a683e934df60534c60",
    },
    // TODO: add Ropsten, Rinkeby, Mainnet
  }
};

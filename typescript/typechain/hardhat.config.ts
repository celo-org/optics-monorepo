require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-etherscan');
require('../optics-tests/lib/index');
const { task } = require("hardhat/config");
const { verifyLatestCoreDeploy, verifyLatestBridgeDeploy } = require("../optics-deploy/src/verifyLatestDeploy");
const dotenv = require('dotenv');
dotenv.config();

task("verify-latest-deploy", "Verifies the source code of the latest contract deploy")
  .addParam("type", "The deploy type (`core` or `bridge`)")
  .setAction(async (args: any, hre: any) => {
    const {type} = args;
    if(type == "core") {
      await verifyLatestCoreDeploy(hre);
    } else if (type == "bridge") {
      await verifyLatestBridgeDeploy(hre);
    }
  });

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
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

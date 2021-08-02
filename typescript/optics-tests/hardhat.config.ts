require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-etherscan');
require('./lib/index');
const { task } = require("hardhat/config");
const { verifyLatestCoreDeploy, verifyLatestBridgeDeploy } = require("../optics-deploy/src/verifyLatestDeploy");
const dotenv = require('dotenv');
dotenv.config();

task("verify-latest-deploy", "Verifies the source code of the latest contract deploy")
    .addParam("type", "The deploy type (`core` or `bridge`)")
    .setAction(async (args: any) => {
      const {type} = args;
      if(type == "core") {
        await verifyLatestCoreDeploy();
      } else if (type == "bridge") {
        await verifyLatestBridgeDeploy();
      }
    });

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: '0.7.3',

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};

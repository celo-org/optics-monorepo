import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "@typechain/hardhat";
const { task } = require("hardhat/config");
const {
  verifyLatestBridgeDeploy,
} = require("../../typescript/optics-deploy/src/verification/verifyLatestDeploy");
import * as dotenv from "dotenv";
dotenv.config();

task(
  "verify-latest-deploy",
  "Verifies the source code of the latest contract deploy"
).setAction(async (args: any, hre: any) => {
  await verifyLatestBridgeDeploy(hre);
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

  gasReporter: {
    currency: "USD",
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

  typechain: {
    outDir: "../../typescript/typechain/optics-xapps",
    target: "ethers-v5",
    alwaysGenerateOverloads: false, // should overloads with full signatures like deposit(uint256) be generated always, even if there are no overloads?
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

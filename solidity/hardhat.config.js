require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require("solidity-coverage");

require("./scripts");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.7.6",

  networks: {
    localhost: {
      url: "http://localhost:8545",
    },
  },
};

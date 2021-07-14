import { HardhatRuntimeEnvironment } from "hardhat/types";

import { getOutputFromLatestDeploy } from "../../../typescript/optics-deploy/src/readDeployOutput";

const envError = (network: string) =>
  `pass --network tag to hardhat task (current network=${network})`;

// list of networks supported by Etherscan
const etherscanNetworks = ["mainnet", "kovan", "goerli", "ropsten", "rinkeby"];

/*
 * Generate link to Etherscan for an address on the given network
 * */
function etherscanLink(network: string, address: string) {
  const prefix = network == "mainnet" ? "" : `${network}.`;
  return `https://${prefix}etherscan.io/address/${address}`;
}

/*
 * Parse the contract verification inputs
 * that were output by the latest contract deploy
 * for the network that hardhat is configured to
 * and attempt to verify those contracts' source code on Etherscan
 * */
export async function verifyLatestDeploy(hre: HardhatRuntimeEnvironment) {
  const network = hre.network.name;

  // assert that network from .env is supported by Etherscan
  if (!etherscanNetworks.includes(network)) {
    throw new Error(`Network not supported by Etherscan; ${envError(network)}`);
  }
  console.log(`VERIFY ${network}`);

  // get the JSON verification inputs for the given network
  // from the latest contract deploy; throw if not found
  const verificationInputs = getOutputFromLatestDeploy(network, "verification");

  // loop through each verification input for each contract in the file
  for (let verificationInput of verificationInputs) {
    // attempt to verify contract on etherscan
    // (await one-by-one so that Etherscan doesn't rate limit)
    await verifyContract(network, verificationInput, hre);
  }
}

/*
 * Given one contract verification input,
 * attempt to verify the contracts' source code on Etherscan
 * */
export async function verifyContract(
  network: string,
  verificationInput: any,
  hre: HardhatRuntimeEnvironment
) {
  const { name, address, constructorArguments } = verificationInput;
  try {
    console.log(
      `   Attempt to verify ${name}   -  ${etherscanLink(network, address)}`
    );
    await hre.run("verify:verify", {
      network,
      address,
      constructorArguments,
    });
    console.log(`   SUCCESS verifying ${name}`);
  } catch (e) {
    console.log(`   ERROR verifying ${name}`);
    console.error(e);
  }
  console.log("\n\n"); // add space after each attempt
}

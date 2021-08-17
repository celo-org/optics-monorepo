import { verifyProxy } from './verifyProxy';

import {
  getPathToLatestDeployConfig,
  getPathToLatestBridgeConfig,
  getVerificationInputFromDeploy,
} from './readDeployOutput';

const envError = (network: string) =>
  `pass --network tag to hardhat task (current network=${network})`;

// list of networks supported by Etherscan
const etherscanNetworks = ['mainnet', 'kovan', 'goerli', 'ropsten', 'rinkeby'];

/*
 * Generate link to Etherscan for an address on the given network
 * */
function etherscanLink(network: string, address: string) {
  const prefix = network == 'mainnet' ? '' : `${network}.`;
  return `https://${prefix}etherscan.io/address/${address}`;
}

/*
 * Parse the contract verification inputs
 * that were output by the latest contract deploy
 * for the network that hardhat is configured to
 * and attempt to verify those contracts' source code on Etherscan
 * */
export async function verifyLatestBridgeDeploy(hre: any, etherscanKey: string) {
  const path = getPathToLatestBridgeConfig();
  return verifyDeploy(path, etherscanKey, hre);
}

/*
 * Parse the contract verification inputs
 * that were output by the latest contract deploy
 * for the network that hardhat is configured to
 * and attempt to verify those contracts' source code on Etherscan
 * */
export async function verifyLatestCoreDeploy(hre: any, etherscanKey: string) {
  const path = getPathToLatestDeployConfig();
  return verifyDeploy(path, etherscanKey, hre);
}

/*
 * Parse the contract verification inputs
 * that were output by the given contract deploy
 * for the network that hardhat is configured to
 * and attempt to verify those contracts' source code on Etherscan
 * */
async function verifyDeploy(path: string, etherscanKey: string, hre: any) {
  const network = hre.network.name;

  // assert that network from .env is supported by Etherscan
  if (!etherscanNetworks.includes(network)) {
    throw new Error(`Network not supported by Etherscan; ${envError(network)}`);
  }
  console.log(`VERIFY ${network}`);

  // get the JSON verification inputs for the given network
  // from the latest contract deploy; throw if not found
  const verificationInputs = getVerificationInputFromDeploy(path, network);

  // loop through each verification input for each contract in the file
  for (let verificationInput of verificationInputs) {
    // attempt to verify contract on etherscan
    // (await one-by-one so that Etherscan doesn't rate limit)
    await verifyContract(network, etherscanKey, verificationInput, hre);
  }
}

/*
 * Given one contract verification input,
 * attempt to verify the contracts' source code on Etherscan
 * */
async function verifyContract(
  network: string,
  etherscanKey: string,
  verificationInput: any,
  hre: any,
) {
  const { name, address, constructorArguments, isProxy } = verificationInput;
  try {
    console.log(
      `   Attempt to verify ${name}   -  ${etherscanLink(network, address)}`,
    );
    await hre.run('verify:verify', {
      network,
      address,
      constructorArguments,
    });
    console.log(`   SUCCESS verifying ${name}`);

    if (isProxy) {
      console.log(`   Attempt to verify as proxy`);
      await verifyProxy(network, address, etherscanKey);
      console.log(`   SUCCESS submitting proxy verification`);
    }
  } catch (e) {
    console.log(`   ERROR verifying ${name}`);
    console.error(e);
  }
  console.log('\n\n'); // add space after each attempt
}

const hardhat = require('hardhat');
const fs = require('fs');
const envy = require('envy');

// pull HARDHAT_NETWORK variable from ../.env
const env = envy();
const {hardhatNetwork} = env;
const envError = (network) => `ensure HARDHAT_NETWORK variable is set in solidity/optics-core/.env (current HARDHAT_NETWORK=${network})`;

// list of networks supported by Etherscan
const etherscanNetworks = ["mainnet", "kovan", "goerli", "ropsten", "rinkeby"];

/*
* Parse the contract verification inputs
* that were output by the latest contract deploy
* for one network (specified by HARDHAT_NETWORK .env variable)
* and attempt to verify those contracts' source code on Etherscan
* */
async function verifyLatestDeploy(network) {
  // assert that network from .env is supported by Etherscan
  if(!etherscanNetworks.includes(network)) {
    throw new Error(`Network not supported by Etherscan; ${envError(network)}`)
  } else if(hardhat.network.name != network) {
    throw new Error(`Hardhat network doesn't match network in .env (hardhat: ${hardhat.network.name}); ${envError(network)}`);
  }
  console.log(`VERIFY ${network}`);

  // get the JSON verification inputs for the given network
  // from the latest contract deploy; throw if not found
  const verificationInputs = getVerificationInputsForNetwork(network);

  // loop through each verification input for each contract in the file
  for (let verificationInput of verificationInputs) {
    // attempt to verify contract on etherscan
    // (await one-by-one so that Etherscan doesn't rate limit)
    await verifyContract(network, verificationInput);
  }
}

/*
* Given one contract verification input,
* attempt to verify the contracts' source code on Etherscan
* */
async function verifyContract(network, verificationInput) {
  const { name, address, constructorArguments } = verificationInput;
  try {
    console.log(
      `   Attempt to verify ${name}   -  ${etherscanLink(network, address)}`,
    );
    await hardhat.run('verify:verify', {
      network,
      address,
      constructorArguments,
    });
    console.log(`   SUCCESS verifying ${name}`);
  } catch (e) {
    console.log(`   ERROR verifying ${name}`);
    console.error(e);
  }
  console.log('\n\n'); // add space after each attempt
}

/*
* Generate link to Etherscan for an address on the given network
* */
function etherscanLink(network, address) {
  const prefix = network == 'mainnet' ? '' : network + '.';
  return `https://${prefix}etherscan.io/address/${address}`;
}

/*
* Parse the contract verification inputs
* that were output by the latest contract deploy
* for one network (specified by HARDHAT_NETWORK .env variable)
* Throw if the file is not found
* */
function getVerificationInputsForNetwork(network) {
  const configPath = '../../rust/config';
  const defaultConfigName = 'default';
  const verificationFileSuffix = 'verification.json';

  // get the names of all non-default config directories within the relative configPath
  let configFolders = fs
    .readdirSync(configPath, { withFileTypes: true })
    .filter((dirEntry) => dirEntry.isDirectory() && dirEntry.name != defaultConfigName)
    .map((dirEntry) => dirEntry.name);

  // if no non-default config folders are found, return
  if (configFolders.length == 0) {
    throw new Error("No config folders found");
  }

  // get path to newest generated config folder
  // (config folder names are UTC strings of the date they were generated - the greatest string is newest folder)
  const newestConfigFolder = configFolders.reduce((a, b) => {
    return a > b ? a : b;
  });
  const path = `${configPath}/${newestConfigFolder}`;

  // filter for files with "verification" in the file name within the newest config folder
  const targetFileName = `${network}_${verificationFileSuffix}`;

  const file = fs
    .readdirSync(path, { withFileTypes: true })
    .find((dirEntry) => dirEntry.name == targetFileName);

  if(!file) {
    throw new Error(`No verification inputs found for ${network} at ${path}/${targetFileName}; ${envError(network)}`);
  }

  return JSON.parse(fs.readFileSync(`${path}/${targetFileName}`));
}

verifyLatestDeploy(hardhatNetwork);

const hardhat = require('hardhat');
const fs = require('fs');

async function verifyContract(verificationInput, network) {
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

async function verifyChain(path, fileName) {
  // names of networks not supported by Etherscan
  const nonEtherscanNetworks = ['alfajores', 'celo'];

  // parse network from file name
  const nameTokens = fileName.split('_');
  const network = nameTokens[0];

  // skip verifying networks that are not supported by Etherscan
  if (nonEtherscanNetworks.includes(network)) {
    return;
  }

  console.log(`VERIFY CHAIN: ${network}`);

  // read JSON contents from file
  let verificationInputs = JSON.parse(fs.readFileSync(`${path}/${fileName}`));

  // loop through each verification input in file
  for (let verificationInput of verificationInputs) {
    // attempt to verify contract on etherscan
    // (await one-by-one so that Etherscan doesn't rate limit)
    await verifyContract(verificationInput, network);
  }
}

async function verifyLatestDeploy() {
  const { path, files } = getVerificationFilePathsForLatestDeploy();

  for (let file of files) {
    await verifyChain(path, file);
  }
}

function etherscanLink(network, address) {
  const prefix = network == 'mainnet' ? '' : network + '.';
  return `https://${prefix}etherscan.io/address/${address}`;
}

function getVerificationFilePathsForLatestDeploy() {
  const configPath = '../../rust/config';
  const defaultConfigName = 'default';
  const verificationFileSuffix = 'verification.json';

  // get the names of all non-default config folders within the relative configPath
  let configFolders = fs
    .readdirSync(configPath, { withFileTypes: true })
    .filter((dirEntry) => dirEntry.isDirectory())
    .map((dirEntry) => dirEntry.name)
    .filter((dirEntry) => dirEntry != defaultConfigName);

  // if no non-default config folders are found, return
  if (configFolders.length == 0) {
    return [];
  }

  // get path to newest generated config folder
  // (config folder names are UTC strings of the date they were generated - the greatest string is newest folder)
  const newestConfigFolder = configFolders.reduce((a, b) => {
    return a > b ? a : b;
  });
  const path = `${configPath}/${newestConfigFolder}`;

  // filter for files with "verification" in the file name within the newest config folder
  const files = fs
    .readdirSync(path, { withFileTypes: true })
    .map((dirEntry) => dirEntry.name)
    .filter((filePath) => filePath.includes(verificationFileSuffix));

  return {
    path, // relative path to the newest config folder
    files, // array of verification files within newest config folder
  };
}

verifyLatestDeploy();

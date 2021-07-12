const fs = require('fs');

// TODO: deprecate this file & import from ../../typescript/src/readDeployOutput.ts

function getPathToLatestDeployConfig() {
  const configPath = '../../rust/config';
  const defaultConfigName = 'default';

  // get the names of all non-default config directories within the relative configPath
  let configFolders = fs
    .readdirSync(configPath, { withFileTypes: true })
    .filter(
      (dirEntry) =>
        dirEntry.isDirectory() && dirEntry.name != defaultConfigName,
    )
    .map((dirEntry) => dirEntry.name);

  // if no non-default config folders are found, return
  if (configFolders.length == 0) {
    throw new Error('No config folders found');
  }

  // get path to newest generated config folder
  // (config folder names are UTC strings of the date they were generated - the greatest string is newest folder)
  const newestConfigFolder = configFolders.reduce((a, b) => {
    return a > b ? a : b;
  });

  return `${configPath}/${newestConfigFolder}`;
}

/*
 * @notice
 * - Determine the folder with the  *most recent* contract deploy output
 * - Get the file in that folder for (network, configTypeSuffix)
 * - Parse contents of file as JSON & return them
 * - Throw if the file is not found
 * @param network target network to parse ("alfajores", "kovan"")
 * @param fileSuffix target file suffix to parse ("config", "contracts", "verification")
 * */
function getOutputFromLatestDeploy(network, fileSuffix) {
  const path = getPathToLatestDeployConfig();
  const targetFileName = `${network}_${fileSuffix}.json`;

  const file = fs
    .readdirSync(path, { withFileTypes: true })
    .find((dirEntry) => dirEntry.name == targetFileName);

  if (!file) {
    throw new Error(
      `No verification inputs found for ${network} at ${path}/${targetFileName}`,
    );
  }

  return JSON.parse(fs.readFileSync(`${path}/${targetFileName}`));
}

module.exports = {
  getOutputFromLatestDeploy,
};

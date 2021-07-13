const fs = require('fs');

// TODO: deprecate this file & import from ../../typescript/optics-deploy/src/readDeployOutput.ts

/*
/*
* Get path to *most recent* config folder
* of Optics core system deploys
* */
function getPathToLatestDeployConfig() {
  const configPath = '../../rust/config';
  const ignoreFolders = ["default"];
  return getPathToLatestConfig(configPath, ignoreFolders);
}

function getPathToLatestConfig(configPath, ignoreFolders = []) {
  // get the names of all non-default config directories within the relative configPath
  let configFolders = fs
      .readdirSync(configPath, {withFileTypes: true})
      .filter(
          (dirEntry) =>
              dirEntry.isDirectory() && !ignoreFolders.includes(dirEntry.name),
      )
      .map((dirEntry) => dirEntry.name);

  // if no non-default config folders are found, return
  if (configFolders.length == 0) {
    throw new Error(`No config folders found at ${configPath}`);
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
 * Given a path to a contract deploy config,
 * get the verification input file from that deploy
 * for the given network
 * Parse contents of file as JSON & return them
 * Throw if the file is not found
 * @param path relative path to deploy config folder ("../../rust/config/1625570709419")
 * @param network target network to parse ("alfajores", "kovan")
 * */
function getVerificationInputFromDeploy(path, network) {
  return parseFileFromDeploy(path, network, "verification");
}

/*
 * @notice
 * - Determine the folder with the  *most recent* contract deploy output
 * - Get the file in that folder for (network, configTypeSuffix)
 * - Parse contents of file as JSON & return them
 * - Throw if the file is not found
 * @param path relative path to deploy config folder ("../../rust/config/1625570709419")
 * @param network target network to parse ("alfajores", "kovan"")
 * @param fileSuffix target file suffix to parse ("config", "contracts", "verification")
 * */
function parseFileFromDeploy(path, network, fileSuffix) {
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
  getVerificationInputFromDeploy,
  getPathToLatestDeployConfig,
};

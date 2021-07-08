import fs from 'fs';

/*
 * @notice Get the list of networks included in the most recent contract deploy
 * @return list of networks deployed sas strings
 * */
export function getNetworksFromLatestDeploy(): string[] {
  const path = getPathToLatestDeployConfig();
  const targetFileSuffix = `_contracts.json`;

  const deployOutputFileNames = fs
    .readdirSync(path, { withFileTypes: true })
    .map((dirEntry: fs.Dirent) => dirEntry.name)
    .filter((fileName: string) => fileName.includes(targetFileSuffix));

  let chainNames: string[] = [];
  for (let deployOutputFileName of deployOutputFileNames) {
    const tokens: string[] = deployOutputFileName.split('_');
    const chainName: string = tokens[0];
    chainNames.push(chainName);
  }
  return chainNames;
}

/*
 * @notice
 * - Get the deploy config from the *most recent* contract deploy
 * for the (network, configTypeSuffix) pair
 * - Return the contents of the file as a JSON object
 * - Throw if the file is not found
 * @param network target network to parse ("alfajores", "kovan"")
 * @param fileSuffix target file suffix to parse ("config", "contracts", "verification")
 * */
export function getOutputFromLatestDeploy(
  network: string,
  fileSuffix: string,
): any {
  const path = getPathToLatestDeployConfig();
  const targetFileName = `${network}_${fileSuffix}.json`;

  const file = fs
    .readdirSync(path, { withFileTypes: true })
    .find((dirEntry: fs.Dirent) => dirEntry.name == targetFileName);

  if (!file) {
    throw new Error(
      `No verification inputs found for ${network} at ${path}/${targetFileName}`,
    );
  }

  const fileString: string = fs
    .readFileSync(`${path}/${targetFileName}`)
    .toString();

  return JSON.parse(fileString);
}

/*
 * @notice Return the path to the *most recent* contract deploy configs
 * @return path to folder
 * */
function getPathToLatestDeployConfig(): string {
  const configPath = '../rust/config';
  const defaultConfigName = 'default';

  // get the names of all non-default config directories within the relative configPath
  let configFolders: string[] = fs
    .readdirSync(configPath, { withFileTypes: true })
    .filter(
      (dirEntry: fs.Dirent) =>
        dirEntry.isDirectory() && dirEntry.name != defaultConfigName,
    )
    .map((dirEntry: fs.Dirent) => dirEntry.name);

  // if no non-default config folders are found, return
  if (configFolders.length == 0) {
    throw new Error('No config folders found');
  }

  // get path to newest generated config folder
  // (config folder names are UTC strings of the date they were generated - the greatest string is newest folder)
  const newestConfigFolder: string = configFolders.reduce((a, b) => {
    return a > b ? a : b;
  });
  return `${configPath}/${newestConfigFolder}`;
}

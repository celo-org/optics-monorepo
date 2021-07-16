import fs from 'fs';

/*
 * @notice Get the list of networks included in the contract deploy at path
 * @param path relative path to core system deploy
 * @return list of networks deployed as strings
 * */
export function getNetworksFromDeploy(path: string): string[] {
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
 * @notice Return the path to the folder with the greatest name
 * within the folder at configPath,
 * (excluding any folders within ignoreFolders)
 * @param configPath relative path to top directory
 * @param ignoreFolders names of folders to exclude within configPath
 * @return path to folder
 * */
function getPathToLatestConfig(configPath: string, ignoreFolders: string[] = []) {
  // get the names of all non-default config directories within the relative configPath
  let configFolders: string[] = fs
      .readdirSync(configPath, {withFileTypes: true})
      .filter(
          (dirEntry: fs.Dirent) =>
              dirEntry.isDirectory() && !ignoreFolders.includes(dirEntry.name),
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

/*
 * @notice Return the path to the *most recent* bridge deploy configs
 * from the *most recent* core contract deploy
 * @return path to folder
 * */
export function getPathToLatestBridgeDeploy(): string {
  const latestCoreDeployPath = getPathToLatestDeploy();
  return getPathToLatestConfig(latestCoreDeployPath);
}

/*
 * @notice Return the path to the *most recent* contract deploy configs
 * @return path to folder
 * */
export function getPathToLatestDeploy(): string {
  const configPath = '../../rust/config';
  const ignoreFolders = ["default"];
  return getPathToLatestConfig(configPath, ignoreFolders);
}

/*
 * @notice Return the JSON-parsed file specified
 * for the contract deploy at path
 * for the network & filetype
 * Throw if the file is not found
 * @param path relative path to core system deploy
 * @param network target network to parse ("alfajores", "kovan"")
 * @param fileSuffix target file suffix to parse ("config", "contracts", "verification")
 * */
export function parseFileFromDeploy(
    path: string,
    network: string,
    fileSuffix: string,
): any {
  const targetFileName = `${network}_${fileSuffix}.json`;

  const file = fs
      .readdirSync(path, { withFileTypes: true })
      .find((dirEntry: fs.Dirent) => dirEntry.name == targetFileName);

  if (!file) {
    throw new Error(
        `No ${fileSuffix} files found for ${network} at ${path}/${targetFileName}`,
    );
  }

  const fileString: string = fs
      .readFileSync(`${path}/${targetFileName}`)
      .toString();

  return JSON.parse(fileString);
}

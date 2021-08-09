import { getPathToLatestDeploy } from '../src/readDeployOutput';
import { deployBridges } from '../src/bridge';
import * as alfajores from '../config/alfajores';
import * as kovan from '../config/kovan';
import { BridgeDeploy } from '../src/bridge/BridgeDeploy';

// get the path to the latest core system deploy
const path = getPathToLatestDeploy();

const alfajoresDeploy = new BridgeDeploy(
  alfajores.chain,
  alfajores.bridgeConfig,
  path,
);
const kovanDeploy = new BridgeDeploy(kovan.chain, kovan.bridgeConfig, path);

deployBridges([alfajoresDeploy, kovanDeploy]);

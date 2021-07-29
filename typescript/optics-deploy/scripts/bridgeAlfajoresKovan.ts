import { getPathToLatestDeploy } from '../src/readDeployOutput';
import { deployBridges } from '../src/bridge';
import * as alfajores from '../config/alfajores';
import * as kovan from '../config/kovan';
import { BridgeDeploy } from '../src/deploy';

// get the path to the latest core system deploy
const path = getPathToLatestDeploy();

const alfajoresDeploy = new BridgeDeploy(
  alfajores.chain,
  alfajores.config,
  path,
);
const kovanDeploy = new BridgeDeploy(kovan.chain, kovan.config, path);

deployBridges([alfajoresDeploy, kovanDeploy]);

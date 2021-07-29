import { getPathToLatestDeploy } from '../src/readDeployOutput';
import { deployBridges } from '../src/bridge';
import { alfajores } from '../config/alfajores';
import { kovan } from '../config/kovan';
import { BridgeDeploy } from '../src/deploy';

// get the path to the latest core system deploy
const path = getPathToLatestDeploy();

const alfajoresDeploy = BridgeDeploy.freshFromConfig(alfajores, path);
const kovanDeploy = BridgeDeploy.freshFromConfig(kovan, path);

deployBridges([alfajoresDeploy, kovanDeploy]);

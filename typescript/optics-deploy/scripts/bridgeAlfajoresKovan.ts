import {getPathToLatestDeploy} from '../src/readDeployOutput';
import {deployBridges, getBridgeDeploy} from '../src/bridge';
import { alfajores } from "../config/alfajores";
import { kovan } from "../config/kovan";

// get the path to the latest core system deploy
const path = getPathToLatestDeploy();

const alfajoresDeploy = getBridgeDeploy(alfajores, path);
const kovanDeploy = getBridgeDeploy(kovan, path);

deployBridges([alfajoresDeploy, kovanDeploy]);


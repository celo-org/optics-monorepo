import {getPathToLatestDeploy} from '../src/readDeployOutput';
import {getBridgeDeploy, deployBridges} from '../../bridge';
import { alfajores } from "../config/alfajores";
import { kovan } from "../config/kovan";

// get the path to the latest core system deploy
const path = getPathToLatestDeploy();

const alfajoresDeploy = getBridgeDeploy(path, alfajores);
const kovanDeploy = getBridgeDeploy(path, kovan);

deployBridges([alfajoresDeploy, kovanDeploy]);


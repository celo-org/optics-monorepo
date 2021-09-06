import { getPathToLatestDeploy } from '../../src/verification/readDeployOutput';
import { deployBridges } from '../../src/bridge';
import * as alfajores from '../../config/testnets/alfajores';
import * as rinkarby from '../../config/testnets/rinkarby';
import { BridgeDeploy } from '../../src/bridge/BridgeDeploy';

// get the path to the latest core system deploy
const path = getPathToLatestDeploy();

const alfajoresDeploy = new BridgeDeploy(
  alfajores.chain,
  alfajores.bridgeConfig,
  path,
);
const rinkarbyDeploy = new BridgeDeploy(
  rinkarby.chain,
  rinkarby.bridgeConfig,
  path,
);

deployBridges([alfajoresDeploy, rinkarbyDeploy]);

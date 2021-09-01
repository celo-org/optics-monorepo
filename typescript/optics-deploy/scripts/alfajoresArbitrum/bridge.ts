import { getPathToLatestDeploy } from '../../src/verification/readDeployOutput';
import { deployBridges } from '../../src/bridge';
import * as alfajores from '../../config/testnets/alfajores';
import * as arbitrum from '../../config/testnets/arbitrum';
import { BridgeDeploy } from '../../src/bridge/BridgeDeploy';

// get the path to the latest core system deploy
const path = getPathToLatestDeploy();

const alfajoresDeploy = new BridgeDeploy(
  alfajores.chain,
  alfajores.bridgeConfig,
  path,
);
const arbitrumDeploy = new BridgeDeploy(
  arbitrum.chain,
  arbitrum.bridgeConfig,
  path,
);

deployBridges([alfajoresDeploy, arbitrumDeploy]);

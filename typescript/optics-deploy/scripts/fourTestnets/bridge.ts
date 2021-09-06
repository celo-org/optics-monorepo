import { getPathToLatestDeploy } from '../../src/verification/readDeployOutput';
import { deployBridges } from '../../src/bridge';
import * as alfajores from '../../config/testnets/alfajores';
import * as kovan from '../../config/testnets/kovan';
import * as rinkeby from '../../config/testnets/rinkeby';
import * as rinkarby from '../../config/testnets/rinkarby';
import { BridgeDeploy } from '../../src/bridge/BridgeDeploy';

// get the path to the latest core system deploy
const path = getPathToLatestDeploy();

const alfajoresDeploy = new BridgeDeploy(
    alfajores.chain,
    alfajores.bridgeConfig,
    path,
);
const kovanDeploy = new BridgeDeploy(kovan.chain, kovan.bridgeConfig, path);

const rinkebyDeploy = new BridgeDeploy(
    rinkeby.chain,
    rinkeby.bridgeConfig,
    path,
);

const rinkarbyDeploy = new BridgeDeploy(
    rinkarby.chain,
    rinkarby.bridgeConfig,
    path,
);

deployBridges([kovanDeploy, alfajoresDeploy, rinkebyDeploy, rinkarbyDeploy]);

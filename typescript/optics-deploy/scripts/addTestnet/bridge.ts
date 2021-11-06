import {deployNewChainBridge} from '../../src/bridge';
import * as alfajores from '../../config/testnets/alfajores';
import * as kovan from '../../config/testnets/kovan';
import * as rinkeby from '../../config/testnets/rinkeby';
import * as rinkarby from '../../config/testnets/rinkarby';
import {BridgeDeploy, ExistingBridgeDeploy} from '../../src/bridge/BridgeDeploy';
import {deployEnvironment} from "../../src/chain";

let environment = deployEnvironment();

const path =
    environment === 'staging' ? "../../rust/config/staging" : "../../rust/config/development";

// Instantiate Existing Bridge Deploys
const alfajoresDeploy = new ExistingBridgeDeploy(
    alfajores.chain,
    alfajores.bridgeConfig,
    path,
);
const kovanDeploy = new ExistingBridgeDeploy(kovan.chain, kovan.bridgeConfig, path);

const rinkebyDeploy = new ExistingBridgeDeploy(
    rinkeby.chain,
    rinkeby.bridgeConfig,
    path,
);

// Instantiate New Bridge Deploy
const rinkarbyDeploy = new BridgeDeploy(
    rinkarby.chain,
    rinkarby.bridgeConfig,
    path,
);

deployNewChainBridge(rinkarbyDeploy, [kovanDeploy, alfajoresDeploy, rinkebyDeploy]);

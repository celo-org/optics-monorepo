import * as alfajores from '../../../config/testnets/alfajores';
import * as kovan from '../../../config/testnets/kovan';
import * as rinkeby from '../../../config/testnets/rinkeby';
import {CoreDeploy as Deploy, ExistingCoreDeploy} from '../../../src/core/CoreDeploy';
import { deployEnvironment } from '../../../src/chain';
import {checkGovernanceSystem} from "../../../src/core/checks";

const environment = deployEnvironment();

const path =
    environment === 'staging' ? "../../rust/config/staging" : "../../rust/config/development";

// Instantiate Existing Deploys
const alfajoresConfig =
    environment === 'staging' ? alfajores.stagingConfig : alfajores.devConfig;
const alfajoresDeploy = new ExistingCoreDeploy(path, alfajores.chain, alfajoresConfig);

const kovanConfig =
    environment === 'staging' ? kovan.stagingConfig : kovan.devConfig;
const kovanDeploy = new ExistingCoreDeploy(path, kovan.chain, kovanConfig);

const rinkebyConfig =
    environment === 'staging' ? rinkeby.stagingConfig : rinkeby.devConfig;
const rinkebyDeploy = new ExistingCoreDeploy(path, rinkeby.chain, rinkebyConfig);

check([kovanDeploy, alfajoresDeploy, rinkebyDeploy]);

async function check(deploys: Deploy[]) {
    const governorDomain = kovanDeploy.chain.domain;
    const governorAddress = await kovanDeploy.chain.deployer.getAddress();
    return checkGovernanceSystem(deploys, governorDomain, governorAddress);
}

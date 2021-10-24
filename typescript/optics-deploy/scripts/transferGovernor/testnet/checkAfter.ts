import * as alfajores from '../../../config/testnets/alfajores';
import * as kovan from '../../../config/testnets/kovan';
import * as rinkeby from '../../../config/testnets/rinkeby';
import { ExistingCoreDeploy } from '../../../src/core/CoreDeploy';
import { deployEnvironment } from '../../../src/chain';
import { checkGovernanceSystem } from "../../../src/core/checks";

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

check();

async function check() {
    const deploys = [rinkebyDeploy, kovanDeploy, alfajoresDeploy];
    const newGovernorDomain = rinkebyDeploy.chain.domain;
    const newGovernorAddress = await rinkebyDeploy.chain.deployer.getAddress();
    return checkGovernanceSystem(deploys, newGovernorDomain, newGovernorAddress);
}

import {transferGovernorship} from '../../../src/core';
import {CoreDeploy as Deploy, ExistingCoreDeploy} from '../../../src/core/CoreDeploy';
import { deployEnvironment } from '../../../src/chain';
import * as kovan from '../../../config/testnets/kovan';
import * as rinkeby from '../../../config/testnets/rinkeby';
import {checkGovernanceSystem} from "../../../src/core/checks";

let environment = deployEnvironment();
const newGovernor = "";

const path =
    environment === 'staging' ? "../../rust/config/staging" : "../../rust/config/development";

// Instantiate Governor Deploy
const kovanConfig =
    environment === 'staging' ? kovan.stagingConfig : kovan.devConfig;
const kovanDeploy = new ExistingCoreDeploy(path, kovan.chain, kovanConfig);

// Instantiate New Deploy
const rinkebyConfig =
    environment === 'staging' ? rinkeby.stagingConfig : rinkeby.devConfig;
const rinkebyDeploy = new ExistingCoreDeploy(path, rinkeby.chain, rinkebyConfig);

transfer();

async function transfer() {
    const newGovernorDomain = rinkebyDeploy.chain.domain;
    const newGovernorAddress = await rinkebyDeploy.chain.deployer.getAddress();
    return transferGovernorship(kovanDeploy, newGovernorDomain, newGovernorAddress);
}

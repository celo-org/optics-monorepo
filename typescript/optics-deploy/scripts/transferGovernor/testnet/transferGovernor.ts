import { transferGovernorship } from '../../../src/core';
import { ExistingCoreDeploy } from '../../../src/core/CoreDeploy';
import { deployEnvironment } from '../../../src/chain';
import * as kovan from '../../../config/testnets/kovan';
import * as alfajores from "../../../config/testnets/alfajores";

let environment = deployEnvironment();

const path =
    environment === 'staging' ? "../../rust/config/staging" : "../../rust/config/development";

// Instantiate Old Governor Deploy
const kovanConfig =
    environment === 'staging' ? kovan.stagingConfig : kovan.devConfig;
const kovanDeploy = new ExistingCoreDeploy(path, kovan.chain, kovanConfig);

// Instantiate New Governor Deploy
const alfajoresConfig =
    environment === 'staging' ? alfajores.stagingConfig : alfajores.devConfig;
const alfajoresDeploy = new ExistingCoreDeploy(path, alfajores.chain, alfajoresConfig);

transfer();

async function transfer() {
    const newGovernorDomain = alfajoresDeploy.chain.domain;
    const newGovernorAddress = await alfajoresDeploy.chain.deployer.getAddress();
    return transferGovernorship(kovanDeploy, newGovernorDomain, newGovernorAddress);
}

import {transferGovernorship} from '../../src/core';
import * as rinkarby from '../../config/testnets/rinkarby';
import {ExistingCoreDeploy} from '../../src/core/CoreDeploy';
import { deployEnvironment } from '../../src/chain';
import * as kovan from "../../config/testnets/kovan";

let environment = deployEnvironment();

const path =
    environment === 'staging' ? "../../rust/config/staging" : "../../rust/config/development";

// Instantiate Governor Deploy
const kovanConfig =
    environment === 'staging' ? kovan.stagingConfig : kovan.devConfig;
const kovanDeploy = new ExistingCoreDeploy(path, kovan.chain, kovanConfig);

// Instantiate New Deploy
let rinkarbyConfig =
    environment === 'staging' ? rinkarby.stagingConfig : rinkarby.devConfig;
const rinkarbyDeploy = new ExistingCoreDeploy(path, rinkarby.chain, rinkarbyConfig);

transfer();

async function transfer() {
    const governorDomain = kovanDeploy.chain.domain;
    const governorAddress = await kovanDeploy.chain.deployer.getAddress();
    return transferGovernorship(rinkarbyDeploy, governorDomain, governorAddress);
}

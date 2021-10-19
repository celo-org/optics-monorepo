import {deployNewChain} from '../../src/core';
import * as alfajores from '../../config/testnets/alfajores';
import * as kovan from '../../config/testnets/kovan';
import * as rinkeby from '../../config/testnets/rinkeby';
import * as secondAlfajores from '../../config/testnets/secondAlfajores';
import {CoreDeploy, ExistingCoreDeploy} from '../../src/core/CoreDeploy';
import { deployEnvironment } from '../../src/chain';

let environment = deployEnvironment();

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

// Instantiate New Deploy
let secondAlfajoresConfig =
    environment === 'staging' ? secondAlfajores.stagingConfig : secondAlfajores.devConfig;
const secondAlfajoresDeploy = new CoreDeploy(secondAlfajores.chain, secondAlfajoresConfig);

deployNewChain(secondAlfajoresDeploy,[kovanDeploy, alfajoresDeploy, rinkebyDeploy]);

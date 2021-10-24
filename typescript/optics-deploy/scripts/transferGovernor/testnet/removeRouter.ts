import {removeSelfAsGovernanceRouter} from '../../../src/core';
import {ExistingCoreDeploy} from '../../../src/core/CoreDeploy';
import { deployEnvironment } from '../../../src/chain';
import * as alfajores from "../../../config/testnets/alfajores";

let environment = deployEnvironment();

const path =
    environment === 'staging' ? "../../rust/config/staging" : "../../rust/config/development";

// Instantiate Governor Deploy
const alfajoresConfig =
    environment === 'staging' ? alfajores.stagingConfig : alfajores.devConfig;
const alfajoresDeploy = new ExistingCoreDeploy(path, alfajores.chain, alfajoresConfig);

removeSelfAsGovernanceRouter(alfajoresDeploy);
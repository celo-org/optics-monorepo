import { deployNChains } from '../src/core';
import * as alfajores from '../config/alfajores';
import * as kovan from '../config/kovan';
import * as rinkeby from '../config/rinkeby';
import { CoreDeploy } from '../src/core/CoreDeploy';
import { deployEnvironment } from '../src/chain';

let environment = deployEnvironment();

let alfaConfig =
  environment === 'staging' ? alfajores.stagingConfig : alfajores.devConfig;
let kovanConfig =
  environment === 'staging' ? kovan.stagingConfig : kovan.devConfig;
let rinkebyConfig =
  environment === 'staging' ? rinkeby.stagingConfig : rinkeby.devConfig;

const alfaDeploy = new CoreDeploy(alfajores.chain, alfaConfig);
const kovanDeploy = new CoreDeploy(kovan.chain, kovanConfig);
const rinkebyDeploy = new CoreDeploy(rinkeby.chain, rinkebyConfig);

deployNChains([alfaDeploy, kovanDeploy, rinkebyDeploy]);

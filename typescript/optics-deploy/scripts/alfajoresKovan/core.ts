import { deployTwoChains } from '../../src/core';
import * as alfajores from '../../config/testnets/alfajores';
import * as kovan from '../../config/testnets/kovan';
import { CoreDeploy } from '../../src/core/CoreDeploy';
import { deployEnvironment } from '../../src/chain';

let environment = deployEnvironment();

let alfaConfig =
  environment === 'staging' ? alfajores.stagingConfig : alfajores.devConfig;
let kovanConfig =
  environment === 'staging' ? kovan.stagingConfig : kovan.devConfig;

const alfaDeploy = new CoreDeploy(alfajores.chain, alfaConfig);
const kovanDeploy = new CoreDeploy(kovan.chain, kovanConfig);

deployTwoChains(alfaDeploy, kovanDeploy);

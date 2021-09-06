import { deployTwoChains } from '../../src/core';
import * as alfajores from '../../config/testnets/alfajores';
import * as rinkarby from '../../config/testnets/rinkarby';
import { CoreDeploy } from '../../src/core/CoreDeploy';
import { deployEnvironment } from '../../src/chain';

let environment = deployEnvironment();

let alfaConfig =
  environment === 'staging' ? alfajores.stagingConfig : alfajores.devConfig;
let rinkarbyConfig =
  environment === 'staging' ? rinkarby.stagingConfig : rinkarby.devConfig;

const alfaDeploy = new CoreDeploy(alfajores.chain, alfaConfig);
const rinkarbyDeploy = new CoreDeploy(rinkarby.chain, rinkarbyConfig);

deployTwoChains(alfaDeploy, rinkarbyDeploy);

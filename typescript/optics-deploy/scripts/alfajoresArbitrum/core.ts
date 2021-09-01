import { deployTwoChains } from '../../src/core';
import * as alfajores from '../../config/testnets/alfajores';
import * as arbitrum from '../../config/testnets/arbitrum';
import { CoreDeploy } from '../../src/core/CoreDeploy';
import { deployEnvironment } from '../../src/chain';

let environment = deployEnvironment();

let alfaConfig =
  environment === 'staging' ? alfajores.stagingConfig : alfajores.devConfig;
let arbitrumConfig =
  environment === 'staging' ? arbitrum.stagingConfig : arbitrum.devConfig;

const alfaDeploy = new CoreDeploy(alfajores.chain, alfaConfig);
const arbitrumDeploy = new CoreDeploy(arbitrum.chain, arbitrumConfig);

deployTwoChains(alfaDeploy, arbitrumDeploy);

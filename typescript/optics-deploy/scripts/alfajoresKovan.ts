import { deployTwoChains } from '../src/core';
import * as alfajores from '../config/alfajores';
import * as kovan from '../config/kovan';
import { CoreDeploy } from '../src/deploy';

const alfaDeploy = new CoreDeploy(alfajores.chain, alfajores.config);
const kovanDeploy = new CoreDeploy(kovan.chain, kovan.config);

deployTwoChains(alfaDeploy, kovanDeploy);

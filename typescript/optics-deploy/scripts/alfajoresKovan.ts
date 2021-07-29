import { deployTwoChains } from '../src/core';
import { opticsAlfajores } from '../config/alfajores';
import { opticsKovan } from '../config/kovan';
import { CoreDeploy } from '../src/deploy';

const alfaDeploy = CoreDeploy.freshFromConfig(opticsAlfajores);
const kovanDeploy = CoreDeploy.freshFromConfig(opticsKovan);

deployTwoChains(alfaDeploy, kovanDeploy);

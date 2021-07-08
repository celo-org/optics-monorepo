import { deployTwoChains } from '../index';
import { freshDeploy } from '../chain';
import { opticsAlfajores } from "../config/alfajores";
import { opticsKovan } from "../config/kovan";

const alfaDeploy = freshDeploy(opticsAlfajores);
const kovanDeploy = freshDeploy(opticsKovan);

deployTwoChains(alfaDeploy, kovanDeploy);

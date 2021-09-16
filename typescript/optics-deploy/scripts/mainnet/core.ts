import { deployNChains } from '../../src/core';
import * as celo from '../../config/mainnets/celo';
import * as ethereum from '../../config/mainnets/ethereum';
import * as polygon from '../../config/mainnets/polygon';
import { CoreDeploy } from '../../src/core/CoreDeploy';

let celoConfig = celo.config;
let kovanConfig = ethereum.config;
let polygonConfig = polygon.config;

const celoDeploy = new CoreDeploy(celo.chain, celoConfig);
const kovanDeploy = new CoreDeploy(ethereum.chain, kovanConfig);
const polygonDeploy = new CoreDeploy(polygon.chain, polygonConfig);

deployNChains([kovanDeploy, celoDeploy, polygonDeploy]);

import { deployNChains } from '../../src/core';
import * as celo from '../../config/mainnets/celo';
import * as ethereum from '../../config/mainnets/ethereum';
import * as polygon from '../../config/mainnets/polygon';
import * as avalanche from '../../config/mainnets/avalanche';
import { CoreDeploy } from '../../src/core/CoreDeploy';

let celoConfig = celo.config;
let ethereumConfig = ethereum.config;
let polygonConfig = polygon.config;
let avalancheConfig = avalanche.config;

const celoDeploy = new CoreDeploy(celo.chain, celoConfig);
const ethereumDeploy = new CoreDeploy(ethereum.chain, ethereumConfig);
const polygonDeploy = new CoreDeploy(polygon.chain, polygonConfig);
const avalancheDeploy = new CoreDeploy(avalanche.chain, avalancheConfig);

deployNChains([celoDeploy, polygonDeploy, avalancheDeploy, ethereumDeploy]);

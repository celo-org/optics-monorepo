import * as celo from '../../../config/mainnets/celo';
import * as ethereum from '../../../config/mainnets/ethereum';
import * as polygon from '../../../config/mainnets/polygon';
import {CoreDeploy as Deploy, ExistingCoreDeploy} from '../../../src/core/CoreDeploy';
import {checkGovernanceSystem} from "../../../src/core/checks";

const path = "../../rust/config/mainnet";

const celoConfig = celo.config;
const ethereumConfig = ethereum.config;
const polygonConfig = polygon.config;

const celoDeploy = new ExistingCoreDeploy(path, celo.chain, celoConfig);
const ethereumDeploy = new ExistingCoreDeploy(path, ethereum.chain, ethereumConfig);
const polygonDeploy = new ExistingCoreDeploy(path, polygon.chain, polygonConfig);

check([ethereumDeploy, celoDeploy, polygonDeploy]);

async function check(deploys: Deploy[]) {
    const governorDomain = ethereumDeploy.chain.domain;
    const governorAddress = ethereumDeploy.config.governor!.address;
    return checkGovernanceSystem(deploys, governorDomain, governorAddress!);
}



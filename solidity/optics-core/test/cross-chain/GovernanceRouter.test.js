const { ethers } = require('hardhat');
const { expect } = require('chai');
const { domainsToTestConfigs } = require('./generateTestChainConfigs');
const {
  deployMultipleChains,
  getGovernanceRouter,
} = require('./deployCrossChainTest');

/*
 * Deploy the full Optics suite on two chains
 */
describe('GovernanceRouter', async () => {
  const domains = [1000, 2000];

  before(async () => {
    // generate TestChainConfigs for the given domains
    const configs = await domainsToTestConfigs(domains);

    // deploy the entire Optics suite on each chain
    chainDetails = await deployMultipleChains(configs);
  });

  it('Transfers governorship', async () => {
    const govRouter1 = getGovernanceRouter(chainDetails, domains[0]);
    const govRouter2 = getGovernanceRouter(chainDetails, domains[1]);

    govRouter1.setRouter(domains[1], govRouter2.address);

    console.log('gov 1 govDomain', await govRouter1.governorDomain());
    console.log('gov 1 govAddr', await govRouter1.governor());
    console.log('gov 2 govDomain', await govRouter2.governorDomain());
    console.log('gov 2 govAddr', await govRouter2.governor());

    const newGov = govRouter2.address;
    govRouter1.transferGovernor(domains[1], newGov);

    console.log('gov 2 address', newGov);
    console.log('gov 1 govDomain', await govRouter1.governorDomain());
    console.log('gov 1 govAddr', await govRouter1.governor());
    console.log('gov 2 govDomain', await govRouter2.governorDomain());
    console.log('gov 2 govAddr', await govRouter2.governor());

    expect(await govRouter1.governorDomain()).to.equal(domains[1]);
    expect(await govRouter1.governor()).to.equal(ethers.constants.AddressZero);
  });
});

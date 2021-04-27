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
  let govRouter1;
  let govRouter2;

  before(async () => {
    // generate TestChainConfigs for the given domains
    const configs = await domainsToTestConfigs(domains);

    // deploy the entire Optics suite on each chain
    chainDetails = await deployMultipleChains(configs);

    // get both governanceRouters
    govRouter1 = getGovernanceRouter(chainDetails, domains[0]);
    govRouter2 = getGovernanceRouter(chainDetails, domains[1]);

    // set routers
    govRouter1.setRouterAddress(domains[1], govRouter2.address);
    govRouter2.setRouterAddress(domains[0], govRouter1.address);

    // assign govRouter1 to governor
    const governor = await govRouter1.governor();
    govRouter2.transferGovernor(domains[0], governor);
  });

  it('Transfers governorship', async () => {
    console.log('gov 1 govDomain', await govRouter1.governorDomain());
    console.log('gov 1 govAddr', await govRouter1.governor());
    console.log('gov 2 govDomain', await govRouter2.governorDomain());
    console.log('gov 2 govAddr', await govRouter2.governor());

    const governor = await govRouter1.governor();
    await govRouter1.transferGovernor(domains[1], governor);

    console.log('gov 1 govDomain', await govRouter1.governorDomain());
    console.log('gov 1 govAddr', await govRouter1.governor());
    console.log('gov 2 govDomain', await govRouter2.governorDomain());
    console.log('gov 2 govAddr', await govRouter2.governor());

    expect(
      govRouter1.interface.events[
        'TransferGovernor(uint32,uint32,address,address)'
      ].name,
    ).to.equal('TransferGovernor');

    expect(await govRouter1.governorDomain()).to.equal(domains[1]);
    expect(await govRouter1.governor()).to.equal(ethers.constants.AddressZero);
    expect(await govRouter2.governorDomain()).to.equal(domains[1]);
    expect(await govRouter2.governor()).to.not.equal(
      ethers.constants.AddressZero,
    );
  });

  // it('Formats')
});

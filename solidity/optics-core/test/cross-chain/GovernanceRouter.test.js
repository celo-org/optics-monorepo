const { ethers } = require('hardhat');
const { provider } = waffle;
const { expect } = require('chai');
const { domainsToTestConfigs } = require('./generateTestChainConfigs');
const {
  deployMultipleChains,
  getHome,
  getGovernanceRouter,
} = require('./deployCrossChainTest');

/*
 * Deploy the full Optics suite on two chains
 */
describe('GovernanceRouter', async () => {
  const domains = [1000, 2000];
  let govRouterA;
  let govRouterB;
  let homeA;
  let updater;

  before(async () => {
    // generate TestChainConfigs for the given domains
    const configs = await domainsToTestConfigs(domains);

    // deploy the entire Optics suite on each chain
    chainDetails = await deployMultipleChains(configs);

    // set updater
    [signer] = provider.getWallets();
    updater = await optics.Updater.fromSigner(signer, domains[0]);

    // get both governanceRouters
    govRouterA = getGovernanceRouter(chainDetails, domains[0]);
    govRouterB = getGovernanceRouter(chainDetails, domains[1]);

    // set routers
    govRouterA.setRouterAddress(domains[1], govRouterB.address);
    govRouterB.setRouterAddress(domains[0], govRouterA.address);

    // assign govRouterA to governor
    const governor = await govRouterA.governor();
    govRouterB.transferGovernor(domains[0], governor);

    homeA = getHome(chainDetails, domains[0]);
  });

  it('Transfers governorship', async () => {
    const currentRoot = await homeA.current();

    const governor = await govRouterA.governor();
    await govRouterA.transferGovernor(domains[1], governor);

    const newRoot = await homeA.queueEnd();

    const { signature } = await updater.signUpdate(currentRoot, newRoot);

    // const [suggestedCurrent, suggestedNew] = await homeA.suggestUpdate();
    homeA.update(currentRoot, newRoot, signature);

    expect(
      govRouterA.interface.events[
        'TransferGovernor(uint32,uint32,address,address)'
      ].name,
    ).to.equal('TransferGovernor');

    expect(await govRouterA.governorDomain()).to.equal(domains[1]);
    expect(await govRouterA.governor()).to.equal(ethers.constants.AddressZero);
    expect(await govRouterB.governorDomain()).to.equal(domains[1]);
    expect(await govRouterB.governor()).to.not.equal(
      ethers.constants.AddressZero,
    );
  });

  // it('Formats')
});

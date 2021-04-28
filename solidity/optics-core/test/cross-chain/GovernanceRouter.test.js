const { ethers } = require('hardhat');
const { provider } = waffle;
const { expect } = require('chai');
const { domainsToTestConfigs } = require('./generateTestChainConfigs');
const {
  deployMultipleChains,
  getHome,
  getReplica,
  getGovernanceRouter,
} = require('./deployCrossChainTest');

/*
 * Deploy the full Optics suite on two chains
 */
describe('GovernanceRouter', async () => {
  const domains = [1000, 2000];
  let govRouterA, govRouterB, home, replica, updater;

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

    home = getHome(chainDetails, domains[0]);
    replica = getReplica(chainDetails, domains[0], domains[1]);
    replicaB = getReplica(chainDetails, domains[1], domains[0]);
  });

  it('Transfers governorship', async () => {
    const currentRoot = await home.current();

    // transfer governorship to govRouterB
    const governor = await govRouterA.governor();
    await govRouterA.transferGovernor(domains[1], governor);

    // get new root and signed update
    const newRoot = await home.queueEnd();
    const { signature } = await updater.signUpdate(currentRoot, newRoot);

    // update home
    home.update(currentRoot, newRoot, signature);

    // get current sequence
    const sequence = (await replica.lastProcessed()).add(1);

    // formatMessage
    const formattedMessage = optics.formatMessage(
      domains[1],
      govRouterA.address,
      sequence,
      domains[0],
      govRouterB.address,
      '0x',
    );

    // Set message status to MessageStatus.Pending
    await replica.setMessagePending(formattedMessage);
    // Set current root on replica
    await replica.setCurrentRoot(newRoot);

    // TODO: prove
    await replica.process(formattedMessage);

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
});

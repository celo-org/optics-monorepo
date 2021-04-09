const { waffle, ethers } = require('hardhat');
const { provider } = waffle;
const { expect } = require('chai');
const testUtils = require('../utils');
const { domainsToTestConfigs } = require('./generateTestConfigs');
const {
  enqueueUpdateToReplica,
  enqueueMessagesAndUpdateHome,
  formatMessage,
} = require('./crossChainTestUtils');
const {
  deployMultipleChains,
  getHome,
  getReplica,
} = require('./deployCrossChainTest');

describe('SimpleCrossChainMessage', async () => {
  const domains = [1000, 2000];
  const homeDomain = domains[0];
  const replicaDomain = domains[1];

  let randomSigner, chainDetails;
  let latestRoot = {},
    latestUpdate = {};

  before(async () => {
    const configs = await domainsToTestConfigs(domains);

    chainDetails = await deployMultipleChains(configs);

    randomSigner = testUtils.getUnusedSigner(provider, configs.length);
  });

  it('All Homes suggest empty update values when queue is empty', async () => {
    for (let domain of domains) {
      const home = getHome(chainDetails, domain);

      const length = await home.queueLength();
      expect(length).to.equal(0);

      const [suggestedCurrent, suggestedNew] = await home.suggestUpdate();
      expect(suggestedCurrent).to.equal(ethers.utils.formatBytes32String(0));
      expect(suggestedNew).to.equal(ethers.utils.formatBytes32String(0));
    }
  });

  it('All Replicas have empty queue of pending updates', async () => {
    for (let destinationDomain of domains) {
      for (let originDomain of domains) {
        if (destinationDomain !== originDomain) {
          const replica = getReplica(
            chainDetails,
            destinationDomain,
            originDomain,
          );

          const length = await replica.queueLength();
          expect(length).to.equal(0);

          const [pending, confirmAt] = await replica.nextPending();
          expect(pending).to.equal(ethers.utils.formatBytes32String(0));
          expect(confirmAt).to.equal(0);
        }
      }
    }
  });

  it('Origin Home Accepts one valid update', async () => {
    const messages = ['message'].map((message) =>
      formatMessage(message, replicaDomain, randomSigner.address),
    );
    const update = await enqueueMessagesAndUpdateHome(
      chainDetails,
      homeDomain,
      messages,
    );

    latestUpdate[homeDomain] = update;
    latestRoot[homeDomain] = update.finalRoot;
  });

  let firstRootEnqueuedToReplica;
  it('Destination Replica Accepts the first update', async () => {
    firstRootEnqueuedToReplica = await enqueueUpdateToReplica(
      chainDetails,
      latestUpdate[homeDomain],
      homeDomain,
      replicaDomain,
    );
  });

  it('Origin Home Accepts an update with several batched messages', async () => {
    const messages = ['message1', 'message2', 'message3'].map((message) =>
      formatMessage(message, replicaDomain, randomSigner.address),
    );
    const update = await enqueueMessagesAndUpdateHome(
      chainDetails,
      homeDomain,
      messages,
    );

    latestUpdate[homeDomain] = update;
    latestRoot[homeDomain] = update.finalRoot;
  });

  it('Destination Replica Accepts the second update', async () => {
    await enqueueUpdateToReplica(
      chainDetails,
      latestUpdate[homeDomain],
      homeDomain,
      replicaDomain,
    );
  });

  it('Destination Replica shows first update as the next pending', async () => {
    const replica = getReplica(chainDetails, replicaDomain, homeDomain);
    const [pending] = await replica.nextPending();
    expect(pending).to.equal(firstRootEnqueuedToReplica);
  });

  it('Destination Replica Batch-confirms several ready updates', async () => {
    const replica = getReplica(chainDetails, replicaDomain, homeDomain);

    // Increase time enough for both updates to be confirmable
    const optimisticSeconds = chainDetails[replicaDomain].optimisticSeconds;
    await testUtils.increaseTimestampBy(provider, optimisticSeconds * 2);

    // Replica should be able to confirm updates
    expect(await replica.canConfirm()).to.be.true;

    await replica.confirm();

    // after confirming, current root should be equal to the last submitted update
    const { finalRoot } = latestUpdate[homeDomain];
    expect(await replica.current()).to.equal(finalRoot);
  });

  // TODO: PROVE AND PROCESS MESSAGE ON REPLICA
});

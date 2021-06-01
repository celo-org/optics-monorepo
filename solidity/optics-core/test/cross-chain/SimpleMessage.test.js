const { waffle, ethers } = require('hardhat');
const { provider } = waffle;
const { expect } = require('chai');
const testUtils = require('../utils');
const { domainsToTestConfigs } = require('./generateTestChainConfigs');
const {
  enqueueUpdateToReplica,
  enqueueMessagesAndUpdateHome,
  formatMessage,
  formatCall,
} = require('./crossChainTestUtils');
const {
  deployMultipleChains,
  getHome,
  getReplica,
  getGovernanceRouter,
} = require('./deployCrossChainTest');
const {
  testCases: proveAndProcessTestCases,
} = require('../../../../vectors/proveAndProcessTestCases.json');

/*
 * Deploy the full Optics suite on two chains
 * enqueue messages to Home
 * sign and submit updates to Home
 * relay updates to Replica
 * confirm updates on Replica
 * TODO prove and process messages on Replica
 */
describe('SimpleCrossChainMessage', async () => {
  const domains = [1000, 2000];
  const homeDomain = domains[0];
  const replicaDomain = domains[1];
  const walletProvider = new testUtils.WalletProvider(provider);

  let randomSigner, chainDetails, firstRootEnqueuedToReplica;
  let latestRoot = {},
    latestUpdate = {};

  before(async () => {
    // generate TestChainConfigs for the given domains
    const configs = await domainsToTestConfigs(domains);

    // deploy the entire Optics suite on each chain
    chainDetails = await deployMultipleChains(configs);

    [randomSigner] = walletProvider.getWalletsPersistent(1);
  });

  it('All Homes have correct initial state', async () => {
    // governorHome has 0 updates
    const governorHome = getHome(chainDetails, homeDomain);

    let length = await governorHome.queueLength();
    expect(length).to.equal(0);

    let [suggestedCurrent, suggestedNew] = await governorHome.suggestUpdate();
    expect(suggestedCurrent).to.equal(ethers.utils.formatBytes32String(0));
    expect(suggestedNew).to.equal(ethers.utils.formatBytes32String(0));

    // nonGovernorHome has 1 update
    const nonGovernorHome = getHome(chainDetails, replicaDomain);

    length = await nonGovernorHome.queueLength();
    expect(length).to.equal(1);

    [suggestedCurrent, suggestedNew] = await nonGovernorHome.suggestUpdate();
    const nullRoot = ethers.utils.formatBytes32String(0);
    expect(suggestedCurrent).to.equal(nullRoot);
    expect(suggestedNew).to.not.equal(nullRoot);
  });

  it('All Replicas have empty queue of pending updates', async () => {
    for (let destinationDomain of domains) {
      for (let remoteDomain of domains) {
        if (destinationDomain !== remoteDomain) {
          const replica = getReplica(
            chainDetails,
            destinationDomain,
            remoteDomain,
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

  it('Proves and processes a message on Replica', async () => {
    // get governance routers
    const governorRouter = getGovernanceRouter(chainDetails, homeDomain);
    const nonGovernorRouter = getGovernanceRouter(chainDetails, replicaDomain);

    const replica = getReplica(chainDetails, replicaDomain, homeDomain);
    const TestRecipient = await optics.deployImplementation('TestRecipient');

    // ensure `processed` has an initial value of false
    expect(await TestRecipient.processed()).to.be.false;

    // create Call message to test recipient that calls `processCall`
    const arg = true;
    const call = await formatCall(TestRecipient, 'processCall', [arg]);
    const callMessage = optics.GovernanceRouter.formatCalls([call]);

    // Create Optics message that is sent from the governor domain and governor
    // to the nonGovernorRouter on the nonGovernorDomain
    const sequence = await replica.nextToProcess();
    const opticsMessage = optics.formatMessage(
      1000,
      governorRouter.address,
      sequence,
      2000,
      nonGovernorRouter.address,
      callMessage,
    );

    // get merkle proof
    const { path, index } = proveAndProcessTestCases[0];
    const leaf = optics.messageToLeaf(opticsMessage);

    // set root
    const proofRoot = await replica.testBranchRoot(leaf, path, index);
    await replica.setCurrentRoot(proofRoot);

    // prove and process message
    await replica.proveAndProcess(opticsMessage, path, index);

    // expect call to have been processed
    expect(await TestRecipient.processed()).to.be.true;
    expect(await replica.messages(leaf)).to.equal(
      optics.MessageStatus.PROCESSED,
    );
    expect(await replica.nextToProcess()).to.equal(sequence + 1);
  });
});

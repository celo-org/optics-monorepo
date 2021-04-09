const { waffle, ethers } = require('hardhat');
const { provider } = waffle;
const { expect } = require('chai');
const testUtils = require('../utils');
const { domainsToTestConfigs } = require('./generateTestConfigs');
const {
  enqueueUpdateReplica,
  enqueueMessagesAndUpdateHome,
  generateMessage,
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
      generateMessage(message, replicaDomain, randomSigner.address),
    );
    const update = await enqueueMessagesAndUpdateHome(
      chainDetails,
      homeDomain,
      messages,
    );

    latestUpdate[homeDomain] = update;
    latestRoot[homeDomain] = update.finalRoot;
  });

  let prevFinalRoot;
  it('Destination Replica Accepts the first update', async () => {
    prevFinalRoot = await enqueueUpdateReplica(
      chainDetails,
      latestUpdate[homeDomain],
      homeDomain,
      replicaDomain,
    );
  });

  it('Origin Home Accepts an update with several batched messages', async () => {
    const messages = ['message1', 'message2', 'message3'].map((message) =>
      generateMessage(message, replicaDomain, randomSigner.address),
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
    await enqueueUpdateReplica(
      chainDetails,
      latestUpdate[homeDomain],
      homeDomain,
      replicaDomain,
    );
  });

  it('Destination Replica shows first update as the next pending', async () => {
    const replica = getReplica(chainDetails, replicaDomain, homeDomain);
    const [pending] = await replica.nextPending();
    expect(pending).to.equal(prevFinalRoot);
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

  ///////// TODO: BELOW HERE NOTHING IS FINALIZED ///////////
  //     it('Proves a valid message', async () => {
  //       // Use 1st proof of 1st merkle vector test case
  //       const testCase = merkleTestCases[0];
  //       let { leaf, index, path } = testCase.proofs[0];
  //
  //       // and then proving the update
  //       await replica.setCurrentRoot(testCase.expectedRoot);
  //
  //       // Ensure proper static call return value
  //       expect(await replica.callStatic.prove(leaf, path, index)).to.be.true;
  //
  //       await replica.prove(leaf, path, index);
  //       expect(await replica.messages(leaf)).to.equal(
  //         optics.MessageStatus.PENDING,
  //       );
  //     });
  //
  //     it('Processes a proved message', async () => {
  //       const [sender, recipient] = provider.getWallets();
  //       const mockRecipient = await deployMockContract(
  //         recipient,
  //         MockRecipient.abi,
  //       );
  //
  //       const mockVal = '0x1234abcd';
  //       await mockRecipient.mock.handle.returns(mockVal);
  //
  //       const sequence = (await replica.lastProcessed()).add(1);
  //       const formattedMessage = optics.formatMessage(
  //         originDomain,
  //         sender.address,
  //         sequence,
  //         ownDomain,
  //         mockRecipient.address,
  //         '0x',
  //       );
  //
  //       // Set message status to MessageStatus.Pending
  //       await replica.setMessagePending(formattedMessage);
  //
  //       // Ensure proper static call return value
  //       let [success, ret] = await replica.callStatic.process(formattedMessage);
  //       expect(success).to.be.true;
  //       expect(ret).to.equal(mockVal);
  //
  //       await replica.process(formattedMessage);
  //       expect(await replica.lastProcessed()).to.equal(sequence);
  //     });
});

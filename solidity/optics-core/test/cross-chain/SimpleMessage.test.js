const { waffle, ethers } = require('hardhat');
const { provider } = waffle;
const { expect } = require('chai');
const testUtils = require('../utils');

// TODO: get these details from a config file?
const domains = [1000, 2000];
const optimisticSeconds = 3;
const initialRoot =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
const lastProcessedIndex = 0;

describe('SimpleCrossChainMessage', async () => {
  let randomSigner;
  const latestRoot = {};
  const latestUpdate = {};
  const chainDetails = {};
  const chainADomain = domains[0];
  const chainBDomain = domains[1];

  before(async () => {
    const wallets = provider.getWallets();
    if (wallets.length <= domains.length) {
      throw new Error('need more wallets');
    }

    randomSigner = wallets[domains.length];

    // generate all chain details
    for (let i = 0; i < domains.length; i++) {
      const domain = domains[i];
      const signer = wallets[i];

      const updaterObject = await optics.Updater.fromSigner(signer, domain);
      chainDetails[domain] = {
        domain,
        updater: signer.address,
        updaterObject,
        signer,
        currentRoot: initialRoot,
        lastProcessedIndex,
        optimisticSeconds,
      };
    }

    // for each domain, deploy the entire contract suite,
    // including one replica for each other domain
    for (let i = 0; i < domains.length; i++) {
      const domain = domains[i];

      // for the given domain,
      // origin is the single chainConfig for the chain at domain
      // remotes is an array of all other chains
      const { origin, remotes } = getOriginAndRemotes(domain);

      // deploy contract suite for this chain
      // note: we will be working with a persistent set of contracts across each test
      const contracts = await optics.deployOptics(origin, remotes);

      chainDetails[domain].contracts = contracts;
    }
  });

  const getHome = (domain) => {
    return chainDetails[domain].contracts.home.proxyWithImplementation;
  };

  const getReplica = (destinationDomain, originDomain) => {
    return chainDetails[destinationDomain].contracts.replicaProxies[
      originDomain
    ].proxyWithImplementation;
  };

  const getUpdaterObject = (domain) => {
    return chainDetails[domain].updaterObject;
  };

  const getOriginAndRemotes = (originDomain) => {
    // the origin is the chain at index i
    const origin = chainDetails[originDomain];

    // the remotes are all chains except the origin
    const allDomains = Object.keys(chainDetails);
    const remoteDomains = allDomains.filter((domain) => domain != originDomain);
    const remotes = remoteDomains.map(
      (remoteDomain) => chainDetails[remoteDomain],
    );

    return {
      origin,
      remotes,
    };
  };

  // // Helper function that enqueues message and returns its root.
  // // The message recipient is the same for all messages enqueued.
  const enqueueMessageAndGetRootHome = async (
    message,
    originDomain,
    destinationDomain,
    recipientAddress = randomSigner.address,
  ) => {
    const home = getHome(originDomain);

    message = ethers.utils.formatBytes32String(message);

    // Send message with random signer address as msg.sender
    await home.enqueue(
      destinationDomain,
      optics.ethersAddressToBytes32(recipientAddress),
      message,
    );

    const [, newRoot] = await home.suggestUpdate();

    latestRoot[originDomain] = newRoot;

    return newRoot;
  };

  async function enqueueMessagesAndUpdateHome(
    messages,
    originDomain,
    destinationDomain,
  ) {
    const home = getHome(originDomain);
    const updater = getUpdaterObject(originDomain);

    const startRoot = await home.current();

    // enqueue each message to Home and get the intermediate root
    const roots = [];
    for (let message of messages) {
      const newRoot = await enqueueMessageAndGetRootHome(
        message,
        originDomain,
        destinationDomain,
      );
      roots.push(newRoot);
    }

    // ensure that Home queue contains
    // all of the roots we just enqueued
    for (let root of roots) {
      expect(await home.queueContains(root)).to.be.true;
    }

    // sign & submit an update from startRoot to finalRoot
    const finalRoot = latestRoot[originDomain];

    const { signature } = await updater.signUpdate(startRoot, finalRoot);

    latestUpdate[originDomain] = {
      startRoot,
      finalRoot,
      signature,
    };

    await expect(home.update(startRoot, finalRoot, signature))
      .to.emit(home, 'Update')
      .withArgs(originDomain, startRoot, finalRoot, signature);

    // ensure that Home root is now finalRoot
    expect(await home.current()).to.equal(finalRoot);

    // ensure that Home queue no longer contains
    // any of the roots we just enqueued -
    // they should be removed from queue when update is submitted
    for (let root of roots) {
      expect(await home.queueContains(root)).to.be.false;
    }

    return finalRoot;
  }

  const enqueueUpdateReplica = async (originDomain, destinationDomain) => {
    const replica = getReplica(destinationDomain, originDomain);

    const { startRoot, finalRoot, signature } = latestUpdate[originDomain];

    await expect(replica.update(startRoot, finalRoot, signature))
      .to.emit(replica, 'Update')
      .withArgs(originDomain, startRoot, finalRoot, signature);

    expect(await replica.queueEnd()).to.equal(finalRoot);

    return finalRoot;
  };

  it('All Homes suggest empty update values when queue is empty', async () => {
    for (let domain of domains) {
      const home = getHome(domain);

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
          const replica = getReplica(destinationDomain, originDomain);

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
    const messages = ['message'];
    await enqueueMessagesAndUpdateHome(messages, chainADomain, chainBDomain);
  });

  let prevFinalRoot;
  it('Destination Replica Accepts the first update', async () => {
    prevFinalRoot = await enqueueUpdateReplica(chainADomain, chainBDomain);
  });

  it('Origin Home Accepts an update with several batched messages', async () => {
    const messages = ['message1', 'message2', 'message3'];
    await enqueueMessagesAndUpdateHome(messages, chainADomain, chainBDomain);
  });

  it('Destination Replica Accepts the second update', async () => {
    await enqueueUpdateReplica(chainADomain, chainBDomain);
  });

  it('Destination Replica shows first update as the next pending', async () => {
    const replica = getReplica(chainBDomain, chainADomain);
    const [pending] = await replica.nextPending();
    expect(pending).to.equal(prevFinalRoot);
  });

  it('Destination Replica Batch-confirms several ready updates', async () => {
    const replica = getReplica(chainBDomain, chainADomain);

    // Increase time enough for both updates to be confirmable
    await testUtils.increaseTimestampBy(provider, optimisticSeconds * 2);

    // Replica should be able to confirm updates
    expect(await replica.canConfirm()).to.be.true;

    await replica.confirm();

    // after confirming, current root should be equal to the last submitted update
    const { finalRoot } = latestUpdate[chainADomain];
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

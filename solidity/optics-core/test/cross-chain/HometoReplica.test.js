const { waffle, ethers } = require('hardhat');
const { provider } = waffle;
const { expect } = require('chai');

// TODO: get these details from a config file?
const domains = [1000, 2000];
const optimisticSeconds = 3;
const currentRoot = ethers.utils.formatBytes32String('current');
const lastProcessedIndex = 0;

describe('CrossChainMessage', async () => {
  let randomSigner;
  const chainDetails = {};
  const originDomain = domains[0];
  const destinationDomain = domains[1];

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
        currentRoot,
        lastProcessedIndex,
        optimisticSeconds,
      };
    }

    // for each domain, deploy the entire contract suite,
    // including one replica for each other domain
    for (let i = 0; i < domains.length; i++) {
      const domain = domains[i];

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
  const enqueueMessageAndGetRoot = async (
    message,
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

    const [, latestRoot] = await home.suggestUpdate();
    return latestRoot;
  };

  async function enqueueMessagesAndUpdate(messages) {
    const home = getHome(originDomain);
    const updater = getUpdaterObject(originDomain);

    const currentRoot = await home.current();

    const roots = [];
    for (let message of messages) {
      const newRoot = await enqueueMessageAndGetRoot(message);
      roots.push(newRoot);
    }

    const finalRoot = roots[roots.length - 1];

    const { signature } = await updater.signUpdate(currentRoot, finalRoot);

    await expect(home.update(currentRoot, finalRoot, signature))
      .to.emit(home, 'Update')
      .withArgs(originDomain, currentRoot, finalRoot, signature);

    expect(await home.current()).to.equal(finalRoot);
    for (let root of roots) {
      expect(await home.queueContains(root)).to.be.false;
    }
  }

  describe('Home', async () => {
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

    it('All Replicas have empty queue of updates', async () => {
      for (let destinationDomain of domains) {
        for (let originDomain of domains) {
          if (destinationDomain !== originDomain) {
            const replica = getReplica(destinationDomain, originDomain);

            const length = await replica.queueLength();
            expect(length).to.equal(0);
          }
        }
      }
    });

    it('Origin Home Accepts one valid update', async () => {
      const messages = ['message'];
      await enqueueMessagesAndUpdate(messages, originDomain);
    });

    it('Origin Home Accepts an update with several batched messages', async () => {
      const messages = ['message1', 'message2', 'message3'];
      await enqueueMessagesAndUpdate(messages, originDomain);
    });
  });

  // describe('Replica', async () => {
  //   const enqueueValidUpdate = async (newRoot) => {
  //     let oldRoot;
  //     if ((await replica.queueLength()) == 0) {
  //       oldRoot = await replica.current();
  //     } else {
  //       const lastEnqueued = await replica.queueEnd();
  //       oldRoot = lastEnqueued;
  //     }
  //
  //     const { signature } = await updaterOne.signUpdate(oldRoot, newRoot);
  //     await replica.update(oldRoot, newRoot, signature);
  //   };
  //
  //   it('Enqueues pending updates', async () => {
  //     const firstNewRoot = ethers.utils.formatBytes32String('first new root');
  //     await enqueueValidUpdate(firstNewRoot);
  //     expect(await replica.queueEnd()).to.equal(firstNewRoot);
  //
  //     const secondNewRoot = ethers.utils.formatBytes32String(
  //       'second next root',
  //     );
  //     await enqueueValidUpdate(secondNewRoot);
  //     expect(await replica.queueEnd()).to.equal(secondNewRoot);
  //   });
  //
  //   it('Returns the earliest pending update', async () => {
  //     const [pending, confirmAt] = await replica.nextPending();
  //     expect(pending).to.equal(firstNewRoot);
  //   });
  //
  //   it('Returns empty update values when queue is empty', async () => {
  //     const [pending, confirmAt] = await replica.nextPending();
  //     expect(pending).to.equal(ethers.utils.formatBytes32String(0));
  //     expect(confirmAt).to.equal(0);
  //   });
  //
  //   it('Rejects update with invalid signature', async () => {
  //     const firstNewRoot = ethers.utils.formatBytes32String('first new root');
  //     await enqueueValidUpdate(firstNewRoot);
  //
  //     const secondNewRoot = ethers.utils.formatBytes32String('second new root');
  //     const { signature: fakeSignature } = await updaterTwo.signUpdate(
  //       firstNewRoot,
  //       secondNewRoot,
  //     );
  //
  //     await expect(
  //       replica.update(firstNewRoot, secondNewRoot, fakeSignature),
  //     ).to.be.revertedWith('bad sig');
  //   });
  //
  //   it('Confirms a ready update', async () => {
  //     const newRoot = ethers.utils.formatBytes32String('new root');
  //     await enqueueValidUpdate(newRoot);
  //
  //     await testUtils.increaseTimestampBy(provider, optimisticSeconds);
  //
  //     expect(await replica.canConfirm()).to.be.true;
  //     await replica.confirm();
  //     expect(await replica.current()).to.equal(newRoot);
  //   });
  //
  //   it('Batch-confirms several ready updates', async () => {
  //     const firstNewRoot = ethers.utils.formatBytes32String('first new root');
  //     await enqueueValidUpdate(firstNewRoot);
  //
  //     const secondNewRoot = ethers.utils.formatBytes32String(
  //       'second next root',
  //     );
  //     await enqueueValidUpdate(secondNewRoot);
  //
  //     // Increase time enough for both updates to be confirmable
  //     await testUtils.increaseTimestampBy(provider, optimisticSeconds * 2);
  //
  //     expect(await replica.canConfirm()).to.be.true;
  //     await replica.confirm();
  //     expect(await replica.current()).to.equal(secondNewRoot);
  //   });
  //
  //   it('Proves a valid message', async () => {
  //     // Use 1st proof of 1st merkle vector test case
  //     const testCase = merkleTestCases[0];
  //     let { leaf, index, path } = testCase.proofs[0];
  //
  //     // and then proving the update
  //     await replica.setCurrentRoot(testCase.expectedRoot);
  //
  //     // Ensure proper static call return value
  //     expect(await replica.callStatic.prove(leaf, path, index)).to.be.true;
  //
  //     await replica.prove(leaf, path, index);
  //     expect(await replica.messages(leaf)).to.equal(
  //       optics.MessageStatus.PENDING,
  //     );
  //   });
  //
  //   it('Processes a proved message', async () => {
  //     const [sender, recipient] = provider.getWallets();
  //     const mockRecipient = await deployMockContract(
  //       recipient,
  //       MockRecipient.abi,
  //     );
  //
  //     const mockVal = '0x1234abcd';
  //     await mockRecipient.mock.handle.returns(mockVal);
  //
  //     const sequence = (await replica.lastProcessed()).add(1);
  //     const formattedMessage = optics.formatMessage(
  //       originDomain,
  //       sender.address,
  //       sequence,
  //       ownDomain,
  //       mockRecipient.address,
  //       '0x',
  //     );
  //
  //     // Set message status to MessageStatus.Pending
  //     await replica.setMessagePending(formattedMessage);
  //
  //     // Ensure proper static call return value
  //     let [success, ret] = await replica.callStatic.process(formattedMessage);
  //     expect(success).to.be.true;
  //     expect(ret).to.equal(mockVal);
  //
  //     await replica.process(formattedMessage);
  //     expect(await replica.lastProcessed()).to.equal(sequence);
  //   });
});

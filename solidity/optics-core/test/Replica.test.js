const { waffle, ethers } = require('hardhat');
const { provider, deployMockContract } = waffle;
const { expect } = require('chai');

const testUtils = require('./utils');
const MockRecipient = require('../artifacts/contracts/test/MockRecipient.sol/MockRecipient.json');

const {
  testCases: merkleTestCases,
} = require('../../../vectors/merkleTestCases.json');
const {
  testCases: proveAndProcessTestCases,
} = require('../../../vectors/proveAndProcessTestCases.json');

const originDomain = 1000;
const ownDomain = 2000;
const optimisticSeconds = 3;
const initialCurrentRoot = ethers.utils.formatBytes32String('current');
const initialLastProcessed = 0;

describe('Replica', async () => {
  let replica, signer, fakeSigner, updater, fakeUpdater;

  const enqueueValidUpdate = async (newRoot) => {
    let oldRoot;
    if ((await replica.queueLength()) == 0) {
      oldRoot = await replica.current();
    } else {
      const lastEnqueued = await replica.queueEnd();
      oldRoot = lastEnqueued;
    }

    const { signature } = await updater.signUpdate(oldRoot, newRoot);
    await replica.update(oldRoot, newRoot, signature);
  };

  before(async () => {
    [signer, fakeSigner] = provider.getWallets();
    updater = await optics.Updater.fromSigner(signer, originDomain);
    fakeUpdater = await optics.Updater.fromSigner(fakeSigner, originDomain);
  });

  beforeEach(async () => {
    const controller = null;
    const { contracts } = await optics.deployUpgradeSetupAndProxy(
      'TestReplica',
      [originDomain],
      [
        ownDomain,
        updater.signer.address,
        initialCurrentRoot,
        optimisticSeconds,
        initialLastProcessed,
      ],
      controller,
      'initialize(uint32, address, bytes32, uint256, uint256)',
    );

    replica = contracts.proxyWithImplementation;
  });

  it('Halts on fail', async () => {
    await replica.setFailed();
    expect(await replica.state()).to.equal(optics.State.FAILED);

    const newRoot = ethers.utils.formatBytes32String('new root');
    await expect(enqueueValidUpdate(newRoot)).to.be.revertedWith(
      'failed state',
    );
  });

  it('Enqueues pending updates', async () => {
    const firstNewRoot = ethers.utils.formatBytes32String('first new root');
    await enqueueValidUpdate(firstNewRoot);
    expect(await replica.queueEnd()).to.equal(firstNewRoot);

    const secondNewRoot = ethers.utils.formatBytes32String('second next root');
    await enqueueValidUpdate(secondNewRoot);
    expect(await replica.queueEnd()).to.equal(secondNewRoot);
  });

  it('Returns the earliest pending update', async () => {
    const firstNewRoot = ethers.utils.formatBytes32String('first new root');
    await enqueueValidUpdate(firstNewRoot);

    const beforeTimestamp = await replica.timestamp();
    const secondNewRoot = ethers.utils.formatBytes32String('second next root');
    await enqueueValidUpdate(secondNewRoot);

    const [pending, confirmAt] = await replica.nextPending();
    expect(pending).to.equal(firstNewRoot);
    expect(confirmAt).to.equal(beforeTimestamp.add(optimisticSeconds));
  });

  it('Returns empty update values when queue is empty', async () => {
    const [pending, confirmAt] = await replica.nextPending();
    expect(pending).to.equal(ethers.utils.formatBytes32String(0));
    expect(confirmAt).to.equal(0);
  });

  it('Rejects update with invalid signature', async () => {
    const firstNewRoot = ethers.utils.formatBytes32String('first new root');
    await enqueueValidUpdate(firstNewRoot);

    const secondNewRoot = ethers.utils.formatBytes32String('second new root');
    const { signature: fakeSignature } = await fakeUpdater.signUpdate(
      firstNewRoot,
      secondNewRoot,
    );

    await expect(
      replica.update(firstNewRoot, secondNewRoot, fakeSignature),
    ).to.be.revertedWith('bad sig');
  });

  it('Rejects initial update not building off initial root', async () => {
    const fakeInitialRoot = ethers.utils.formatBytes32String('fake root');
    const newRoot = ethers.utils.formatBytes32String('new root');
    const { signature } = await updater.signUpdate(fakeInitialRoot, newRoot);

    await expect(
      replica.update(fakeInitialRoot, newRoot, signature),
    ).to.be.revertedWith('not current update');
  });

  it('Rejects updates not building off latest enqueued root', async () => {
    const firstNewRoot = ethers.utils.formatBytes32String('first new root');
    await enqueueValidUpdate(firstNewRoot);

    const fakeLatestRoot = ethers.utils.formatBytes32String('fake root');
    const secondNewRoot = ethers.utils.formatBytes32String('second new root');
    const { signature } = await updater.signUpdate(
      fakeLatestRoot,
      secondNewRoot,
    );

    await expect(
      replica.update(fakeLatestRoot, secondNewRoot, signature),
    ).to.be.revertedWith('not end of queue');
  });

  it('Accepts a double update proof', async () => {
    const firstRoot = await replica.current();
    const secondRoot = ethers.utils.formatBytes32String('second root');
    const thirdRoot = ethers.utils.formatBytes32String('third root');

    const { signature } = await updater.signUpdate(firstRoot, secondRoot);
    const { signature: signature2 } = await updater.signUpdate(
      firstRoot,
      thirdRoot,
    );

    await expect(
      replica.doubleUpdate(
        firstRoot,
        [secondRoot, thirdRoot],
        signature,
        signature2,
      ),
    ).to.emit(replica, 'DoubleUpdate');

    expect(await replica.state()).to.equal(optics.State.FAILED);
  });

  it('Confirms a ready update', async () => {
    const newRoot = ethers.utils.formatBytes32String('new root');
    await enqueueValidUpdate(newRoot);

    await testUtils.increaseTimestampBy(provider, optimisticSeconds);

    expect(await replica.canConfirm()).to.be.true;
    await replica.confirm();
    expect(await replica.current()).to.equal(newRoot);
  });

  it('Batch-confirms several ready updates', async () => {
    const firstNewRoot = ethers.utils.formatBytes32String('first new root');
    await enqueueValidUpdate(firstNewRoot);

    const secondNewRoot = ethers.utils.formatBytes32String('second next root');
    await enqueueValidUpdate(secondNewRoot);

    // Increase time enough for both updates to be confirmable
    await testUtils.increaseTimestampBy(provider, optimisticSeconds * 2);

    expect(await replica.canConfirm()).to.be.true;
    await replica.confirm();
    expect(await replica.current()).to.equal(secondNewRoot);
  });

  it('Rejects confirmation attempt on empty queue', async () => {
    const length = await replica.queueLength();
    expect(length).to.equal(0);

    await expect(replica.confirm()).to.be.revertedWith('no pending');
  });

  it('Rejects an early confirmation attempt', async () => {
    const firstNewRoot = ethers.utils.formatBytes32String('first new root');
    await enqueueValidUpdate(firstNewRoot);

    // Don't increase time enough for update to be confirmable.
    // Note that we use optimisticSeconds - 2 because the call to enqueue
    // the valid root has already increased the timestamp by 1.
    await testUtils.increaseTimestampBy(provider, optimisticSeconds - 2);

    expect(await replica.canConfirm()).to.be.false;
    await expect(replica.confirm()).to.be.revertedWith('not time');
  });

  it('Proves a valid message', async () => {
    // Use 1st proof of 1st merkle vector test case
    const testCase = merkleTestCases[0];
    let { leaf, index, path } = testCase.proofs[0];

    await replica.setCurrentRoot(testCase.expectedRoot);

    // Ensure proper static call return value
    expect(await replica.callStatic.prove(leaf, path, index)).to.be.true;

    await replica.prove(leaf, path, index);
    expect(await replica.messages(leaf)).to.equal(optics.MessageStatus.PENDING);
  });

  it('Rejects an already-proven message', async () => {
    const testCase = merkleTestCases[0];
    let { leaf, index, path } = testCase.proofs[0];

    await replica.setCurrentRoot(testCase.expectedRoot);

    // Prove message, which changes status to MessageStatus.Pending
    await replica.prove(leaf, path, index);
    expect(await replica.messages(leaf)).to.equal(optics.MessageStatus.PENDING);

    // Try to prove message again
    await expect(replica.prove(leaf, path, index)).to.be.revertedWith(
      '!MessageStatus.None',
    );
  });

  it('Rejects invalid message proof', async () => {
    // Use 1st proof of 1st merkle vector test case
    const testCase = merkleTestCases[0];
    let { leaf, index, path } = testCase.proofs[0];

    // Switch ordering of proof hashes
    const firstHash = path[0];
    path[0] = path[1];
    path[1] = firstHash;

    await replica.setCurrentRoot(testCase.expectedRoot);

    expect(await replica.callStatic.prove(leaf, path, index)).to.be.false;

    await replica.prove(leaf, path, index);
    expect(await replica.messages(leaf)).to.equal(optics.MessageStatus.NONE);
  });

  it('Processes a proved message', async () => {
    const [sender, recipient] = provider.getWallets();
    const mockRecipient = await deployMockContract(
      recipient,
      MockRecipient.abi,
    );

    const mockVal = '0x1234abcd';
    await mockRecipient.mock.handle.returns(mockVal);

    const sequence = (await replica.lastProcessed()).add(1);
    const formattedMessage = optics.formatMessage(
      originDomain,
      sender.address,
      sequence,
      ownDomain,
      mockRecipient.address,
      '0x',
    );

    // Set message status to MessageStatus.Pending
    await replica.setMessagePending(formattedMessage);

    // Ensure proper static call return value
    let [success, ret] = await replica.callStatic.process(formattedMessage);
    expect(success).to.be.true;
    expect(ret).to.equal(mockVal);

    await replica.process(formattedMessage);
    expect(await replica.lastProcessed()).to.equal(sequence);
  });

  it('Fails to process an unproved message', async () => {
    const [sender, recipient] = provider.getWallets();
    const sequence = (await replica.lastProcessed()).add(1);
    const body = ethers.utils.formatBytes32String('message');

    const formattedMessage = optics.formatMessage(
      originDomain,
      sender.address,
      sequence,
      ownDomain,
      recipient.address,
      body,
    );

    await expect(replica.process(formattedMessage)).to.be.revertedWith(
      'not pending',
    );
  });

  it('Fails to process out-of-order message', async () => {
    const [sender, recipient] = provider.getWallets();

    // Skip sequence ordering by adding 2 to lastProcessed
    const sequence = (await replica.lastProcessed()).add(2);
    const body = ethers.utils.formatBytes32String('message');

    const formattedMessage = optics.formatMessage(
      originDomain,
      sender.address,
      sequence,
      ownDomain,
      recipient.address,
      body,
    );

    await expect(replica.process(formattedMessage)).to.be.revertedWith(
      '!sequence',
    );
  });

  it('Fails to process message with wrong destination Domain', async () => {
    const [sender, recipient] = provider.getWallets();
    const sequence = (await replica.lastProcessed()).add(1);
    const body = ethers.utils.formatBytes32String('message');

    const formattedMessage = optics.formatMessage(
      originDomain,
      sender.address,
      sequence,
      // Wrong destination Domain
      ownDomain + 5,
      recipient.address,
      body,
    );

    await expect(replica.process(formattedMessage)).to.be.revertedWith(
      '!destination',
    );
  });

  it('Fails to process an undergased transaction', async () => {
    const [sender, recipient] = provider.getWallets();
    const sequence = (await replica.lastProcessed()).add(1);
    const body = ethers.utils.formatBytes32String('message');

    const formattedMessage = optics.formatMessage(
      originDomain,
      sender.address,
      sequence,
      ownDomain,
      recipient.address,
      body,
    );

    // Set message status to MessageStatus.Pending
    await replica.setMessagePending(formattedMessage);

    // Required gas is >= 510,000 (we provide 500,000)
    await expect(
      replica.process(formattedMessage, { gasLimit: 500000 }),
    ).to.be.revertedWith('!gas');
  });

  it('Returns false when processing message for bad handler function', async () => {
    const [sender, recipient] = provider.getWallets();
    const mockRecipient = await deployMockContract(
      recipient,
      MockRecipient.abi,
    );

    // Recipient handler function reverts
    await mockRecipient.mock.handle.reverts();

    const sequence = (await replica.lastProcessed()).add(1);
    const formattedMessage = optics.formatMessage(
      originDomain,
      sender.address,
      sequence,
      ownDomain,
      mockRecipient.address,
      '0x',
    );

    // Set message status to MessageStatus.Pending
    await replica.setMessagePending(formattedMessage);

    // Ensure bad handler function causes process to return false
    let [success] = await replica.callStatic.process(formattedMessage);
    expect(success).to.be.false;
  });

  it('Proves and processes a message', async () => {
    const [sender, recipient] = provider.getWallets();
    const mockRecipient = await deployMockContract(
      recipient,
      MockRecipient.abi,
    );

    const mockVal = '0x1234abcd';
    await mockRecipient.mock.handle.returns(mockVal);

    const sequence = (await replica.lastProcessed()).add(1);

    // Note that hash of this message specifically matches leaf of 1st
    // proveAndProcess test case
    const formattedMessage = optics.formatMessage(
      originDomain,
      sender.address,
      sequence,
      ownDomain,
      mockRecipient.address,
      '0x',
    );

    // Assert above message and test case have matching leaves
    const { leaf, path, index } = proveAndProcessTestCases[0];
    const messageLeaf = optics.messageToLeaf(formattedMessage);
    expect(messageLeaf).to.equal(leaf);

    // Set replica's current root to match root given by proof
    const proofRoot = await replica.testBranchRoot(leaf, path, index);
    await replica.setCurrentRoot(proofRoot);

    await replica.proveAndProcess(formattedMessage, path, index);
    expect;
    expect(await replica.messages(leaf)).to.equal(
      optics.MessageStatus.PROCESSED,
    );
    expect(await replica.lastProcessed()).to.equal(sequence);
  });

  it('Has proveAndProcess fail if prove fails', async () => {
    const [sender, recipient] = provider.getWallets();
    const sequence = (await replica.lastProcessed()).add(1);

    // Use 1st proof of 1st merkle vector test case
    const testCase = merkleTestCases[0];
    let { leaf, index, path } = testCase.proofs[0];

    // Create arbitrary message (contents not important)
    const formattedMessage = optics.formatMessage(
      originDomain,
      sender.address,
      sequence,
      ownDomain,
      recipient.address,
      '0x',
    );

    // Ensure root given in proof and actual root don't match so that
    // replica.prove(...) will fail
    const actualRoot = await replica.current();
    const proofRoot = await replica.testBranchRoot(leaf, path, index);
    expect(proofRoot).to.not.equal(actualRoot);

    await expect(
      replica.proveAndProcess(formattedMessage, path, index),
    ).to.be.revertedWith('!prove');
  });
});

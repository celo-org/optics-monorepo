const { waffle, ethers } = require('hardhat');
const { provider, deployMockContract } = waffle;
const { expect } = require('chai');

const ACTIVE = 0;
const FAILED = 1;
const originSLIP44 = 1000;
const ownSLIP44 = 2000;
const optimisticSeconds = 3;
const initialCurrentRoot = ethers.utils.formatBytes32String('current');
const initialLastProcessed = 0;

describe('Replica', async () => {
  let replica, signer, fakeSigner, updater, fakeUpdater, processor;

  const bytes32 = (num) => `0x${Buffer.alloc(32, num).toString('hex')}`;

  const enqueueValidUpdate = async (newRoot) => {
    let oldRoot;
    if ((await replica.queueLength()) == 0) {
      oldRoot = await replica.current();
    } else {
      const [pending, _confirmAt] = await replica.nextPending();
      oldRoot = pending;
    }

    const { signature } = await updater.signUpdate(oldRoot, newRoot);
    await replica.update(oldRoot, newRoot, signature);
  };

  before(async () => {
    [signer, fakeSigner, processor] = provider.getWallets();
    updater = await optics.Updater.fromSigner(signer, originSLIP44);
    fakeUpdater = await optics.Updater.fromSigner(fakeSigner, originSLIP44);
  });

  beforeEach(async () => {
    const Replica = await ethers.getContractFactory('TestReplica');
    replica = await Replica.deploy(
      originSLIP44,
      ownSLIP44,
      updater.signer.address,
      optimisticSeconds,
      initialCurrentRoot,
      initialLastProcessed,
    );
    await replica.deployed();
  });

  it('Halts on fail', async () => {
    await replica.setFailed();
    expect(await replica.state()).to.equal(FAILED);

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

    expect(await replica.state()).to.equal(FAILED);
  });

  it('Confirms a ready update', async () => {
    const newRoot = ethers.utils.formatBytes32String('new root');
    await enqueueValidUpdate(newRoot);

    await optics.increaseTimestamp(provider, optimisticSeconds);

    await replica.confirm();
    expect(await replica.current()).to.equal(newRoot);
  });

  it('Batch-confirms several ready updates', async () => {
    const firstNewRoot = ethers.utils.formatBytes32String('first new root');
    await enqueueValidUpdate(firstNewRoot);

    const secondNewRoot = ethers.utils.formatBytes32String('second next root');
    await enqueueValidUpdate(secondNewRoot);

    // Increase time enough for both updates to be confirmable
    await optics.increaseTimestamp(provider, optimisticSeconds * 2);

    await replica.confirm();
    expect(await replica.current()).to.equal(secondNewRoot);
  });

  it('Rejects an early confirmation attempt', async () => {
    const firstNewRoot = ethers.utils.formatBytes32String('first new root');
    await enqueueValidUpdate(firstNewRoot);

    // Don't increase time enough for update to be confirmable.
    // Note that we use optimisticSeconds - 2 because the call to enqueue
    // the valid root has already increased the timestamp by 1.
    await optics.increaseTimestamp(provider, optimisticSeconds - 2);

    await expect(replica.confirm()).to.be.revertedWith('not time');
  });

  it('Accepts a valid merkle proof', async () => {});

  it('Rejects an invalid merkle proof', async () => {});

  it('Processes a proved message', async () => {
    let [sender, recipient] = provider.getWallets();
    const sequence = (await replica.lastProcessed()).add(1);
    const body = ethers.utils.formatBytes32String('body');

    sender = optics.ethersAddressToBytes32(sender.address);
    recipient = optics.ethersAddressToBytes32(recipient.address);

    const formattedMessage = optics.formatMessage(
      originSLIP44,
      sender,
      sequence,
      ownSLIP44,
      recipient,
      body,
    );

    // Set message status to Message.Pending
    await replica.setMessagePending(formattedMessage);

    await replica.process(formattedMessage);
    expect(await replica.lastProcessed()).to.equal(sequence);
  });

  it('Fails to process an unproved message', async () => {
    let [sender, recipient] = provider.getWallets();
    const sequence = (await replica.lastProcessed()).add(1);
    const body = ethers.utils.formatBytes32String('body');

    sender = optics.ethersAddressToBytes32(sender.address);
    recipient = optics.ethersAddressToBytes32(recipient.address);

    const formattedMessage = optics.formatMessage(
      originSLIP44,
      sender,
      sequence,
      ownSLIP44,
      recipient,
      body,
    );

    // Don't set message status to Message.Pending
    await expect(replica.process(formattedMessage)).to.be.revertedWith(
      'not pending',
    );
  });
});

import { ethers, optics } from 'hardhat';
import { expect } from 'chai';

import { increaseTimestampBy } from './utils';
import { getTestDeploy } from './testChain';
import { Updater, OpticsState, MessageStatus } from '../lib/core';
import { Signer, BytesArray } from '../lib/types';
import * as contracts from '../../typechain/optics-core';
import { CoreDeploy as Deploy } from '../../optics-deploy/src/core/CoreDeploy';
import {
  deployUnenrolledReplica,
  deployUpgradeBeaconController,
  deployUpdaterManager,
} from '../../optics-deploy/src/core';

import homeDomainHashTestCases from '../../../vectors/homeDomainHash.json';
import merkleTestCases from '../../../vectors/merkle.json';
import proveAndProcessTestCases from '../../../vectors/proveAndProcess.json';

const localDomain = 2000;
const remoteDomain = 1000;
const optimisticSeconds = 3;

describe('Replica', async () => {
  const badRecipientFactories = [
    contracts.BadRecipient1__factory,
    contracts.BadRecipient2__factory,
    contracts.BadRecipient3__factory,
    contracts.BadRecipient4__factory,
    contracts.BadRecipient5__factory,
    contracts.BadRecipient6__factory,
  ];

  let deploys: Deploy[] = [];
  let replica: contracts.TestReplica,
    signer: Signer,
    fakeSigner: Signer,
    opticsMessageSender: Signer,
    updater: Updater,
    fakeUpdater: Updater;

  const enqueueValidUpdate = async (newRoot: string) => {
    let oldRoot;
    if ((await replica.queueLength()).isZero()) {
      oldRoot = await replica.current();
    } else {
      oldRoot = await replica.queueEnd();
    }

    const { signature } = await updater.signUpdate(oldRoot, newRoot);
    await replica.update(oldRoot, newRoot, signature);
  };

  before(async () => {
    [signer, fakeSigner, opticsMessageSender] = await ethers.getSigners();
    updater = await Updater.fromSigner(signer, remoteDomain);
    fakeUpdater = await Updater.fromSigner(fakeSigner, remoteDomain);

    deploys.push(await getTestDeploy(localDomain, updater.address, []));
    deploys.push(await getTestDeploy(remoteDomain, updater.address, []));
  });

  beforeEach(async () => {
    await deployUpdaterManager(deploys[0]);
    await deployUpgradeBeaconController(deploys[0]);

    await deployUnenrolledReplica(deploys[0], deploys[1]);

    replica = deploys[0].contracts.replicas[remoteDomain]
      .proxy! as contracts.TestReplica;
  });

  it('Cannot be initialized twice', async () => {
    let initData = replica.interface.encodeFunctionData('initialize', [
      deploys[0].chain.domain,
      deploys[0].config.updater,
      ethers.constants.HashZero,
      deploys[0].config.optimisticSeconds,
    ]);

    await expect(
      signer.sendTransaction({
        to: replica.address,
        data: initData,
      }),
    ).to.be.revertedWith('Initializable: contract is already initialized');
  });

  it('Halts on fail', async () => {
    await replica.setFailed();
    expect(await replica.state()).to.equal(OpticsState.FAILED);

    const newRoot = ethers.utils.formatBytes32String('new root');
    await expect(enqueueValidUpdate(newRoot)).to.be.revertedWith(
      'failed state',
    );
  });

  it('Calculated domain hash matches Rust-produced domain hash', async () => {
    // Compare Rust output in json file to solidity output (json file matches
    // hash for remote domain of 1000)
    let testDeploy = await getTestDeploy(0, updater.address, []);
    for (let testCase of homeDomainHashTestCases) {
      // set domain, updaterManager and upgradeBeaconController
      testDeploy.chain.domain = testCase.homeDomain;
      testDeploy.contracts.updaterManager = deploys[0].contracts.updaterManager;
      testDeploy.contracts.upgradeBeaconController =
        deploys[0].contracts.upgradeBeaconController;

      // deploy replica
      await deployUnenrolledReplica(testDeploy, testDeploy);
      const tempReplica = testDeploy.contracts.replicas[testCase.homeDomain]
        .proxy! as contracts.TestReplica;

      const { expectedDomainHash } = testCase;
      const homeDomainHash = await tempReplica.testHomeDomainHash();
      expect(homeDomainHash).to.equal(expectedDomainHash);
    }
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

  it('Returns the current value when the queue is empty', async () => {
    const [pending, confirmAt] = await replica.nextPending();
    expect(pending).to.equal(await replica.current());
    expect(confirmAt).to.equal(1);
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
    ).to.be.revertedWith('!updater sig');
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

    expect(await replica.state()).to.equal(OpticsState.FAILED);
  });

  it('Confirms a ready update', async () => {
    const newRoot = ethers.utils.formatBytes32String('new root');
    await enqueueValidUpdate(newRoot);

    await increaseTimestampBy(ethers.provider, optimisticSeconds);

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
    await increaseTimestampBy(ethers.provider, optimisticSeconds * 2);

    expect(await replica.canConfirm()).to.be.true;
    await replica.confirm();
    expect(await replica.current()).to.equal(secondNewRoot);
  });

  it('Rejects confirmation attempt on empty queue', async () => {
    const length = await replica.queueLength();
    expect(length).to.equal(0);

    await expect(replica.confirm()).to.be.revertedWith('!pending');
  });

  it('Rejects an early confirmation attempt', async () => {
    const firstNewRoot = ethers.utils.formatBytes32String('first new root');
    await enqueueValidUpdate(firstNewRoot);

    // Don't increase time enough for update to be confirmable.
    // Note that we use optimisticSeconds - 2 because the call to enqueue
    // the valid root has already increased the timestamp by 1.
    await increaseTimestampBy(ethers.provider, optimisticSeconds - 2);

    expect(await replica.canConfirm()).to.be.false;
    await expect(replica.confirm()).to.be.revertedWith('!time');
  });

  it('Proves a valid message', async () => {
    // Use 1st proof of 1st merkle vector test case
    const testCase = merkleTestCases[0];
    let { leaf, index, path } = testCase.proofs[0];

    await replica.setCurrentRoot(testCase.expectedRoot);

    // Ensure proper static call return value
    expect(await replica.callStatic.prove(leaf, path as BytesArray, index)).to
      .be.true;

    await replica.prove(leaf, path as BytesArray, index);
    expect(await replica.messages(leaf)).to.equal(MessageStatus.PENDING);
  });

  it('Rejects an already-proven message', async () => {
    const testCase = merkleTestCases[0];
    let { leaf, index, path } = testCase.proofs[0];

    await replica.setCurrentRoot(testCase.expectedRoot);

    // Prove message, which changes status to MessageStatus.Pending
    await replica.prove(leaf, path as BytesArray, index);
    expect(await replica.messages(leaf)).to.equal(MessageStatus.PENDING);

    // Try to prove message again
    await expect(
      replica.prove(leaf, path as BytesArray, index),
    ).to.be.revertedWith('!MessageStatus.None');
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

    expect(await replica.callStatic.prove(leaf, path as BytesArray, index)).to
      .be.false;

    await replica.prove(leaf, path as BytesArray, index);
    expect(await replica.messages(leaf)).to.equal(MessageStatus.NONE);
  });

  it('Processes a proved message', async () => {
    const sender = opticsMessageSender;

    const testRecipientFactory = new contracts.TestRecipient__factory(signer);
    const testRecipient = await testRecipientFactory.deploy();

    const sequence = 0;
    const opticsMessage = optics.formatMessage(
      remoteDomain,
      sender.address,
      sequence,
      localDomain,
      testRecipient.address,
      '0x',
    );

    // Set message status to MessageStatus.Pending
    await replica.setMessagePending(opticsMessage);

    // Ensure proper static call return value
    const success = await replica.callStatic.process(opticsMessage);
    expect(success).to.be.true;

    const processTx = replica.process(opticsMessage);
    await expect(processTx)
      .to.emit(replica, 'ProcessSuccess')
      .withArgs(optics.messageToLeaf(opticsMessage));
  });

  it('Fails to process an unproved message', async () => {
    const [sender, recipient] = await ethers.getSigners();
    const sequence = 0;
    const body = ethers.utils.formatBytes32String('message');

    const opticsMessage = optics.formatMessage(
      remoteDomain,
      sender.address,
      sequence,
      localDomain,
      recipient.address,
      body,
    );

    await expect(replica.process(opticsMessage)).to.be.revertedWith('!pending');
  });

  for (let i = 0; i < badRecipientFactories.length; i++) {
    it(`Processes a message from a badly implemented recipient (${
      i + 1
    })`, async () => {
      const sender = opticsMessageSender;
      const factory = new badRecipientFactories[i](signer);
      const badRecipient = await factory.deploy();

      const sequence = 0;
      const opticsMessage = optics.formatMessage(
        remoteDomain,
        sender.address,
        sequence,
        localDomain,
        badRecipient.address,
        '0x',
      );

      // Set message status to MessageStatus.Pending
      await replica.setMessagePending(opticsMessage);
      await replica.process(opticsMessage);
    });
  }

  it('Fails to process message with wrong destination Domain', async () => {
    const [sender, recipient] = await ethers.getSigners();
    const sequence = 0;
    const body = ethers.utils.formatBytes32String('message');

    const opticsMessage = optics.formatMessage(
      remoteDomain,
      sender.address,
      sequence,
      // Wrong destination Domain
      localDomain + 5,
      recipient.address,
      body,
    );

    await expect(replica.process(opticsMessage)).to.be.revertedWith(
      '!destination',
    );
  });

  it('Processes message sent to a non-existent contract address', async () => {
    const sequence = 0;
    const body = ethers.utils.formatBytes32String('message');

    const opticsMessage = optics.formatMessage(
      remoteDomain,
      opticsMessageSender.address,
      sequence,
      localDomain,
      '0x1234567890123456789012345678901234567890', // non-existent contract address
      body,
    );

    // Set message status to MessageStatus.Pending
    await replica.setMessagePending(opticsMessage);
    await expect(replica.process(opticsMessage)).to.not.be.reverted;
  });

  it('Fails to process an undergased transaction', async () => {
    const [sender, recipient] = await ethers.getSigners();
    const sequence = 0;
    const body = ethers.utils.formatBytes32String('message');

    const opticsMessage = optics.formatMessage(
      remoteDomain,
      sender.address,
      sequence,
      localDomain,
      recipient.address,
      body,
    );

    // Set message status to MessageStatus.Pending
    await replica.setMessagePending(opticsMessage);

    // Required gas is >= 510,000 (we provide 500,000)
    await expect(
      replica.process(opticsMessage, { gasLimit: 500000 }),
    ).to.be.revertedWith('!gas');
  });

  it('Returns false when processing message for bad handler function', async () => {
    const sender = opticsMessageSender;
    const [recipient] = await ethers.getSigners();
    const factory = new contracts.BadRecipientHandle__factory(recipient);
    const testRecipient = await factory.deploy();

    const sequence = 0;
    const opticsMessage = optics.formatMessage(
      remoteDomain,
      sender.address,
      sequence,
      localDomain,
      testRecipient.address,
      '0x',
    );

    // Set message status to MessageStatus.Pending
    await replica.setMessagePending(opticsMessage);

    // Ensure bad handler function causes process to return false
    let success = await replica.callStatic.process(opticsMessage);
    expect(success).to.be.false;
  });

  it('Proves and processes a message', async () => {
    const sender = opticsMessageSender;
    const testRecipientFactory = new contracts.TestRecipient__factory(signer);
    const testRecipient = await testRecipientFactory.deploy();

    const sequence = 0;

    // Note that hash of this message specifically matches leaf of 1st
    // proveAndProcess test case
    const opticsMessage = optics.formatMessage(
      remoteDomain,
      sender.address,
      sequence,
      localDomain,
      testRecipient.address,
      '0x',
    );

    // Assert above message and test case have matching leaves
    const { path, index } = proveAndProcessTestCases[0];
    const messageLeaf = optics.messageToLeaf(opticsMessage);

    // Set replica's current root to match newly computed root that includes
    // the new leaf (normally root will have already been computed and path
    // simply verifies leaf is in tree but because it is cryptographically
    // impossible to find the inputs that create a pre-determined root, we
    // simply recalculate root with the leaf using branchRoot)
    const proofRoot = await replica.testBranchRoot(
      messageLeaf,
      path as BytesArray,
      index,
    );
    await replica.setCurrentRoot(proofRoot);

    await replica.proveAndProcess(opticsMessage, path as BytesArray, index);

    expect(await replica.messages(messageLeaf)).to.equal(
      MessageStatus.PROCESSED,
    );
  });

  it('Has proveAndProcess fail if prove fails', async () => {
    const [sender, recipient] = await ethers.getSigners();
    const sequence = 0;

    // Use 1st proof of 1st merkle vector test case
    const testCase = merkleTestCases[0];
    let { leaf, index, path } = testCase.proofs[0];

    // Create arbitrary message (contents not important)
    const opticsMessage = optics.formatMessage(
      remoteDomain,
      sender.address,
      sequence,
      localDomain,
      recipient.address,
      '0x',
    );

    // Ensure root given in proof and actual root don't match so that
    // replica.prove(...) will fail
    const actualRoot = await replica.current();
    const proofRoot = await replica.testBranchRoot(
      leaf,
      path as BytesArray,
      index,
    );
    expect(proofRoot).to.not.equal(actualRoot);

    await expect(
      replica.proveAndProcess(opticsMessage, path as BytesArray, index),
    ).to.be.revertedWith('!prove');
  });
});

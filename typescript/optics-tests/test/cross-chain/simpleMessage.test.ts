import { optics, ethers } from 'hardhat';
import { expect } from 'chai';

import * as utils from './utils';
import { getTestDeploy } from '../testChain';
import { increaseTimestampBy } from '../utils';
import { Updater, MessageStatus } from '../../lib/core';
import { Update, Signer, BytesArray } from '../../lib/types';
import { CoreDeploy as Deploy } from '../../../optics-deploy/src/core/CoreDeploy';
import { deployTwoChains } from '../../../optics-deploy/src/core';
import {
  TestRecipient__factory,
  TestReplica,
} from '../../../typechain/optics-core';

import proveAndProcessTestCases from '../../../../vectors/proveAndProcess.json';

const domains = [1000, 2000];
const localDomain = domains[0];
const remoteDomain = domains[1];

/*
 * Deploy the full Optics suite on two chains
 * enqueue messages to Home
 * sign and submit updates to Home
 * relay updates to Replica
 * confirm updates on Replica
 * TODO prove and process messages on Replica
 */
describe('SimpleCrossChainMessage', async () => {
  // deploys[0] is the local deploy and governor chain
  // deploys[1] is the remote deploy
  let deploys: Deploy[] = [];

  let randomSigner: Signer,
    firstRootEnqueuedToReplica: string,
    updater: Updater,
    latestRoot: string,
    latestUpdate: Update;

  before(async () => {
    [randomSigner] = await ethers.getSigners();
    updater = await Updater.fromSigner(randomSigner, localDomain);

    deploys.push(await getTestDeploy(localDomain, updater.address, []));
    deploys.push(await getTestDeploy(remoteDomain, updater.address, []));

    await deployTwoChains(deploys[0], deploys[1]);
  });

  it('All Homes have correct initial state', async () => {
    const nullRoot = '0x' + '00'.repeat(32);

    // governorHome has 1 updates
    const governorHome = deploys[0].contracts.home?.proxy!;

    let length = await governorHome.queueLength();
    expect(length).to.equal(1);

    let [suggestedCurrent, suggestedNew] = await governorHome.suggestUpdate();
    expect(suggestedCurrent).to.equal(nullRoot);
    expect(suggestedNew).to.not.equal(nullRoot);

    // nonGovernorHome has 2 updates
    const nonGovernorHome = deploys[1].contracts.home?.proxy!;

    length = await nonGovernorHome.queueLength();
    expect(length).to.equal(2);

    [suggestedCurrent, suggestedNew] = await nonGovernorHome.suggestUpdate();
    expect(suggestedCurrent).to.equal(nullRoot);
    expect(suggestedNew).to.not.equal(nullRoot);
  });

  it('All Replicas have empty queue of pending updates', async () => {
    for (let deploy of deploys) {
      const replicas = deploy.contracts.replicas;
      for (let domain in replicas) {
        const replica = replicas[domain].proxy;

        const length = await replica.queueLength();
        expect(length).to.equal(0);

        const [pending, confirmAt] = await replica.nextPending();
        expect(pending).to.equal(await replica.current());
        expect(confirmAt).to.equal(1);
      }
    }
  });

  it('Origin Home Accepts one valid update', async () => {
    const messages = ['message'].map((message) =>
      utils.formatMessage(message, remoteDomain, randomSigner.address),
    );
    const update = await utils.enqueueMessagesAndUpdateHome(
      deploys[0].contracts.home?.proxy!,
      messages,
      updater,
    );

    latestUpdate = update;
    latestRoot = update.newRoot;
  });

  it('Destination Replica Accepts the first update', async () => {
    firstRootEnqueuedToReplica = await utils.enqueueUpdateToReplica(
      latestUpdate,
      deploys[1].contracts.replicas[localDomain].proxy!,
    );
  });

  it('Origin Home Accepts an update with several batched messages', async () => {
    const messages = ['message1', 'message2', 'message3'].map((message) =>
      utils.formatMessage(message, remoteDomain, randomSigner.address),
    );
    const update = await utils.enqueueMessagesAndUpdateHome(
      deploys[0].contracts.home?.proxy!,
      messages,
      updater,
    );

    latestUpdate = update;
    latestRoot = update.newRoot;
  });

  it('Destination Replica Accepts the second update', async () => {
    await utils.enqueueUpdateToReplica(
      latestUpdate,
      deploys[1].contracts.replicas[localDomain].proxy,
    );
  });

  it('Destination Replica shows first update as the next pending', async () => {
    const replica = deploys[1].contracts.replicas[localDomain].proxy;
    const [pending] = await replica.nextPending();
    expect(pending).to.equal(firstRootEnqueuedToReplica);
  });

  it('Destination Replica Batch-confirms several ready updates', async () => {
    const replica = deploys[1].contracts.replicas[localDomain].proxy;

    // Increase time enough for both updates to be confirmable
    const { optimisticSeconds } = deploys[0].config;
    await increaseTimestampBy(ethers.provider, optimisticSeconds * 2);

    // Replica should be able to confirm updates
    expect(await replica.canConfirm()).to.be.true;

    await replica.confirm();

    // after confirming, current root should be equal to the last submitted update
    const { newRoot } = latestUpdate;
    expect(await replica.current()).to.equal(newRoot);
  });

  it('Proves and processes a message on Replica', async () => {
    // get governance routers
    const governorRouter = deploys[0].contracts.governance!.proxy;
    const nonGovernorRouter = deploys[1].contracts.governance!.proxy;

    const replica = deploys[1].contracts.replicas[localDomain]
      .proxy as TestReplica;
    const testRecipientFactory = new TestRecipient__factory(randomSigner);
    const TestRecipient = await testRecipientFactory.deploy();

    // ensure `processed` has an initial value of false
    expect(await TestRecipient.processed()).to.be.false;

    // create Call message to test recipient that calls `processCall`
    const arg = true;
    const call = await utils.formatCall(TestRecipient, 'processCall', [arg]);
    const callMessage = optics.governance.formatCalls([call]);

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
    const proofRoot = await replica.testBranchRoot(
      leaf,
      path as BytesArray,
      index,
    );
    await replica.setCurrentRoot(proofRoot);

    // prove and process message
    await replica.proveAndProcess(opticsMessage, path as BytesArray, index);

    // expect call to have been processed
    expect(await TestRecipient.processed()).to.be.true;
    expect(await replica.messages(leaf)).to.equal(MessageStatus.PROCESSED);
    expect(await replica.nextToProcess()).to.equal(sequence + 1);
  });
});

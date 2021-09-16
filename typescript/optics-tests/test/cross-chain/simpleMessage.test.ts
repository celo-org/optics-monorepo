import { optics, ethers } from 'hardhat';
import { expect } from 'chai';

import * as utils from './utils';
import { getTestDeploy } from '../testChain';
import { Updater, MessageStatus } from '../../lib/core';
import { Update, Signer, BytesArray } from '../../lib/types';
import { CoreDeploy as Deploy } from '@optics-xyz/deploy/dist/src/core/CoreDeploy';
import { deployTwoChains } from '@optics-xyz/deploy/dist/src/core';
import {
  TestRecipient__factory,
  TestReplica,
} from '@optics-xyz/ts-interface/dist/optics-core';

const proveAndProcessTestCases = require('../../../../vectors/proveAndProcess.json');

const domains = [1000, 2000];
const localDomain = domains[0];
const remoteDomain = domains[1];

/*
 * Deploy the full Optics suite on two chains
 * dispatch messages to Home
 * sign and submit updates to Home
 * relay updates to Replica
 * confirm updates on Replica
 * TODO prove and process messages on Replica
 */
describe('SimpleCrossChainMessage', async () => {
  // deploys[0] is the local deploy and governor chain
  // deploys[1] is the remote deploy
  let deploys: Deploy[] = [];

  let randomSigner: Signer, updater: Updater, latestUpdate: Update;

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

    let [suggestedCommitted, suggestedNew] = await governorHome.suggestUpdate();
    expect(suggestedCommitted).to.equal(nullRoot);
    expect(suggestedNew).to.not.equal(nullRoot);

    // nonGovernorHome has 2 updates
    const nonGovernorHome = deploys[1].contracts.home?.proxy!;

    length = await nonGovernorHome.queueLength();
    expect(length).to.equal(2);

    [suggestedCommitted, suggestedNew] = await nonGovernorHome.suggestUpdate();
    expect(suggestedCommitted).to.equal(nullRoot);
    expect(suggestedNew).to.not.equal(nullRoot);
  });

  it('Origin Home Accepts one valid update', async () => {
    const messages = ['message'].map((message) =>
      utils.formatMessage(message, remoteDomain, randomSigner.address),
    );
    const update = await utils.dispatchMessagesAndUpdateHome(
      deploys[0].contracts.home?.proxy!,
      messages,
      updater,
    );

    latestUpdate = update;
  });

  it('Destination Replica Accepts the first update', async () => {
    await utils.updateReplica(
      latestUpdate,
      deploys[1].contracts.replicas[localDomain].proxy!,
    );
  });

  it('Origin Home Accepts an update with several batched messages', async () => {
    const messages = ['message1', 'message2', 'message3'].map((message) =>
      utils.formatMessage(message, remoteDomain, randomSigner.address),
    );
    const update = await utils.dispatchMessagesAndUpdateHome(
      deploys[0].contracts.home?.proxy!,
      messages,
      updater,
    );
    latestUpdate = update;
  });

  it('Destination Replica Accepts the second update', async () => {
    await utils.updateReplica(
      latestUpdate,
      deploys[1].contracts.replicas[localDomain].proxy,
    );
  });

  it('Destination Replica shows latest update as the committed root', async () => {
    const replica = deploys[1].contracts.replicas[localDomain].proxy;
    const { newRoot } = latestUpdate;
    expect(await replica.committedRoot()).to.equal(newRoot);
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
    const nonce = 0;
    const opticsMessage = optics.formatMessage(
      1000,
      governorRouter.address,
      nonce,
      2000,
      nonGovernorRouter.address,
      callMessage,
    );

    // get merkle proof
    const { path, index } = proveAndProcessTestCases[0];
    const messageHash = optics.messageHash(opticsMessage);

    // set root
    const proofRoot = await replica.testBranchRoot(
      messageHash,
      path as BytesArray,
      index,
    );
    await replica.setCommittedRoot(proofRoot);

    // prove and process message
    await replica.proveAndProcess(opticsMessage, path as BytesArray, index);

    // expect call to have been processed
    expect(await TestRecipient.processed()).to.be.true;
    expect(await replica.messages(messageHash)).to.equal(
      MessageStatus.PROCESSED,
    );
  });
});

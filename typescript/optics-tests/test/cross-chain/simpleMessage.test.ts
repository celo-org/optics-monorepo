const { waffle, ethers, optics } = require('hardhat');
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
const { provider } = waffle;
import { getTestDeploy } from '../testChain';
const { expect } = require('chai');
const testUtils = require('../utils');
import { Updater } from '../../lib';
import { Deploy } from '../../../optics-deploy/src/chain';
import { deployTwoChains } from '../../../optics-deploy/src/deployOptics';

// const {
//   enqueueUpdateToReplica,
//   enqueueMessagesAndUpdateHome,
//   formatMessage,
//   formatCall,
// } = require('./crossChainTestUtils');
// const {
//   deployMultipleChains,
//   getHome,
//   getReplica,
//   getGovernanceRouter,
// } = require('./deployCrossChainTest');
const proveAndProcessTestCases = require('../../../../vectors/proveAndProcess.json');

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
  const localDomain = domains[0];
  const remoteDomain = domains[1];
  let deploys: Deploy[] = [];
  // let localDeploy: Deploy, remoteDeploy: Deploy;

  let randomSigner: SignerWithAddress,
    recoveryManager: SignerWithAddress,
    firstRootEnqueuedToReplica: string;
  let latestRoot = {},
    latestUpdate = {};

  before(async () => {
    [randomSigner, recoveryManager] = provider.getWallets();
    const [signer] = await ethers.getSigners();
    const updater = await Updater.fromSigner(signer, localDomain);

    deploys.push(await getTestDeploy(localDomain, updater.address, []));
    deploys.push(await getTestDeploy(remoteDomain, updater.address, []));

    await deployTwoChains(deploys[0], deploys[1]);
  });

  // it('All Homes have correct initial state', async () => {
  //   const nullRoot = ethers.utils.formatBytes32String(0);

  //   // governorHome has 1 updates
  //   const governorHome = deploys[0].contracts.home?.proxy!;

  //   let length = await governorHome.queueLength();
  //   expect(length).to.equal(1);

  //   let [suggestedCurrent, suggestedNew] = await governorHome.suggestUpdate();
  //   expect(suggestedCurrent).to.equal(nullRoot);
  //   expect(suggestedNew).to.not.equal(nullRoot);

  //   // nonGovernorHome has 2 updates
  //   const nonGovernorHome = deploys[1].contracts.home?.proxy!;

  //   length = await nonGovernorHome.queueLength();
  //   expect(length).to.equal(2);

  //   [suggestedCurrent, suggestedNew] = await nonGovernorHome.suggestUpdate();
  //   expect(suggestedCurrent).to.equal(nullRoot);
  //   expect(suggestedNew).to.not.equal(nullRoot);
  // });

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

  // it('Origin Home Accepts one valid update', async () => {
  //   const messages = ['message'].map((message) =>
  //     formatMessage(message, replicaDomain, randomSigner.address),
  //   );
  //   const update = await enqueueMessagesAndUpdateHome(
  //     chainDetails,
  //     homeDomain,
  //     messages,
  //   );

  //   latestUpdate[homeDomain] = update;
  //   latestRoot[homeDomain] = update.finalRoot;
  // });

  // it('Destination Replica Accepts the first update', async () => {
  //   firstRootEnqueuedToReplica = await enqueueUpdateToReplica(
  //     chainDetails,
  //     latestUpdate[homeDomain],
  //     homeDomain,
  //     replicaDomain,
  //   );
  // });

  //   it('Origin Home Accepts an update with several batched messages', async () => {
  //     const messages = ['message1', 'message2', 'message3'].map((message) =>
  //       formatMessage(message, replicaDomain, randomSigner.address),
  //     );
  //     const update = await enqueueMessagesAndUpdateHome(
  //       chainDetails,
  //       homeDomain,
  //       messages,
  //     );

  //     latestUpdate[homeDomain] = update;
  //     latestRoot[homeDomain] = update.finalRoot;
  //   });

  //   it('Destination Replica Accepts the second update', async () => {
  //     await enqueueUpdateToReplica(
  //       chainDetails,
  //       latestUpdate[homeDomain],
  //       homeDomain,
  //       replicaDomain,
  //     );
  //   });

  //   it('Destination Replica shows first update as the next pending', async () => {
  //     const replica = getReplica(chainDetails, replicaDomain, homeDomain);
  //     const [pending] = await replica.nextPending();
  //     expect(pending).to.equal(firstRootEnqueuedToReplica);
  //   });

  //   it('Destination Replica Batch-confirms several ready updates', async () => {
  //     const replica = getReplica(chainDetails, replicaDomain, homeDomain);

  //     // Increase time enough for both updates to be confirmable
  //     const optimisticSeconds = chainDetails[replicaDomain].optimisticSeconds;
  //     await testUtils.increaseTimestampBy(provider, optimisticSeconds * 2);

  //     // Replica should be able to confirm updates
  //     expect(await replica.canConfirm()).to.be.true;

  //     await replica.confirm();

  //     // after confirming, current root should be equal to the last submitted update
  //     const { finalRoot } = latestUpdate[homeDomain];
  //     expect(await replica.current()).to.equal(finalRoot);
  //   });

  //   it('Proves and processes a message on Replica', async () => {
  //     // get governance routers
  //     const governorRouter = getGovernanceRouter(chainDetails, homeDomain);
  //     const nonGovernorRouter = getGovernanceRouter(chainDetails, replicaDomain);

  //     const replica = getReplica(chainDetails, replicaDomain, homeDomain);
  //     const TestRecipient = await optics.deployImplementation('TestRecipient');

  //     // ensure `processed` has an initial value of false
  //     expect(await TestRecipient.processed()).to.be.false;

  //     // create Call message to test recipient that calls `processCall`
  //     const arg = true;
  //     const call = await formatCall(TestRecipient, 'processCall', [arg]);
  //     const callMessage = optics.GovernanceRouter.formatCalls([call]);

  //     // Create Optics message that is sent from the governor domain and governor
  //     // to the nonGovernorRouter on the nonGovernorDomain
  //     const sequence = await replica.nextToProcess();
  //     const opticsMessage = optics.formatMessage(
  //       1000,
  //       governorRouter.address,
  //       sequence,
  //       2000,
  //       nonGovernorRouter.address,
  //       callMessage,
  //     );

  //     // get merkle proof
  //     const { path, index } = proveAndProcessTestCases[0];
  //     const leaf = optics.messageToLeaf(opticsMessage);

  //     // set root
  //     const proofRoot = await replica.testBranchRoot(leaf, path, index);
  //     await replica.setCurrentRoot(proofRoot);

  //     // prove and process message
  //     await replica.proveAndProcess(opticsMessage, path, index);

  //     // expect call to have been processed
  //     expect(await TestRecipient.processed()).to.be.true;
  //     expect(await replica.messages(leaf)).to.equal(
  //       optics.MessageStatus.PROCESSED,
  //     );
  //     expect(await replica.nextToProcess()).to.equal(sequence + 1);
  //   });
});

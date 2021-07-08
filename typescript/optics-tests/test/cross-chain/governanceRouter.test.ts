import { ethers, waffle, optics } from 'hardhat';
const { provider } = waffle;
import { expect } from 'chai';

import {
  enqueueUpdateToReplica,
  formatCall,
  formatOpticsMessage,
} from './utils';
import testUtils from '../utils';
import * as upgradeUtils from '../upgradeUtils';
import { getTestDeploy } from '../testChain';
import { Updater } from '../../lib';
import { Address } from '../../lib/types';
import { Deploy } from '../../../optics-deploy/src/chain';
import {
  deployTwoChains,
  deployUnenrolledReplica,
} from '../../../optics-deploy/src/deployOptics';
import * as contracts from '../../../typechain/optics-core';

const { proof } = require('../../../../vectors/proof.json');

/*
 * Deploy the full Optics suite on two chains
 */
describe('GovernanceRouter', async () => {
  const governorDomain = 1000;
  const nonGovernorDomain = 2000;
  const thirdDomain = 3000;
  const walletProvider = new testUtils.WalletProvider(provider);
  const [thirdRouter] = walletProvider.getWalletsPersistent(1);
  let deploys: Deploy[] = [];

  let governorRouter: contracts.TestGovernanceRouter,
    governorHome: contracts.Home,
    governorReplicaOnNonGovernorChain: contracts.TestReplica,
    nonGovernorRouter: contracts.TestGovernanceRouter,
    nonGovernorReplicaOnGovernorChain: contracts.TestReplica,
    firstGovernor: Address,
    secondGovernor: Address,
    signer: any,
    secondGovernorSigner: any,
    updater: any;

  async function expectGovernor(
    governanceRouter: contracts.TestGovernanceRouter,
    expectedGovernorDomain: number,
    expectedGovernor: Address,
  ) {
    expect(await governanceRouter.governorDomain()).to.equal(
      expectedGovernorDomain,
    );
    expect(await governanceRouter.governor()).to.equal(expectedGovernor);
  }

  beforeEach(async () => {
    deploys = [];
    [signer, secondGovernorSigner] = provider.getWallets();
    updater = await Updater.fromSigner(signer, governorDomain);

    // get fresh test deploy objects
    deploys.push(await getTestDeploy(governorDomain, updater.address, []));
    deploys.push(await getTestDeploy(nonGovernorDomain, updater.address, []));
    deploys.push(await getTestDeploy(thirdDomain, updater.address, []));

    // deploy the entire Optics suite on each chain
    await deployTwoChains(deploys[0], deploys[1]);

    // get both governanceRouters
    governorRouter = deploys[0].contracts.governance
      ?.proxy! as contracts.TestGovernanceRouter;
    nonGovernorRouter = deploys[1].contracts.governance
      ?.proxy! as contracts.TestGovernanceRouter;

    firstGovernor = await governorRouter.governor();
    secondGovernor = await secondGovernorSigner.getAddress();

    governorHome = deploys[0].contracts.home?.proxy!;

    governorReplicaOnNonGovernorChain = deploys[1].contracts.replicas[
      governorDomain
    ].proxy! as contracts.TestReplica;
    nonGovernorReplicaOnGovernorChain = deploys[0].contracts.replicas[
      nonGovernorDomain
    ].proxy! as contracts.TestReplica;
  });

  it('Rejects message from unenrolled replica', async () => {
    await deployUnenrolledReplica(deploys[1], deploys[2]);

    const unenrolledReplica = deploys[1].contracts.replicas[thirdDomain]
      .proxy! as contracts.TestReplica;

    // Create TransferGovernor message
    const transferGovernorMessage = optics.governance.formatTransferGovernor(
      thirdDomain,
      optics.ethersAddressToBytes32(secondGovernor),
    );

    const opticsMessage = await formatOpticsMessage(
      unenrolledReplica,
      governorRouter,
      nonGovernorRouter,
      transferGovernorMessage,
    );

    // Expect replica processing to fail when nonGovernorRouter reverts in handle
    let success = await unenrolledReplica.callStatic.testProcess(opticsMessage);
    expect(success).to.be.false;
  });

  it('Rejects message not from governor router', async () => {
    // Create TransferGovernor message
    const transferGovernorMessage = optics.governance.formatTransferGovernor(
      nonGovernorDomain,
      optics.ethersAddressToBytes32(nonGovernorRouter.address),
    );

    const opticsMessage = await formatOpticsMessage(
      governorReplicaOnNonGovernorChain,
      nonGovernorRouter,
      governorRouter,
      transferGovernorMessage,
    );

    // Set message status to MessageStatus.Pending
    await nonGovernorReplicaOnGovernorChain.setMessagePending(opticsMessage);

    // Expect replica processing to fail when nonGovernorRouter reverts in handle
    let success =
      await nonGovernorReplicaOnGovernorChain.callStatic.testProcess(
        opticsMessage,
      );
    expect(success).to.be.false;
  });

  it('Accepts a valid transfer governor message', async () => {
    // Enroll router for new domain (in real setting this would
    // be executed with an Optics message sent to the nonGovernorRouter)
    await nonGovernorRouter.testSetRouter(
      thirdDomain,
      optics.ethersAddressToBytes32(thirdRouter.address),
    );

    // Create TransferGovernor message
    const transferGovernorMessage = optics.governance.formatTransferGovernor(
      thirdDomain,
      optics.ethersAddressToBytes32(thirdRouter.address),
    );

    const opticsMessage = await formatOpticsMessage(
      governorReplicaOnNonGovernorChain,
      governorRouter,
      nonGovernorRouter,
      transferGovernorMessage,
    );

    // Expect successful tx on static call
    let success = await governorReplicaOnNonGovernorChain.callStatic.process(
      opticsMessage,
    );
    expect(success).to.be.true;

    await governorReplicaOnNonGovernorChain.process(opticsMessage);
    await expectGovernor(
      nonGovernorRouter,
      thirdDomain,
      ethers.constants.AddressZero,
    );
  });

  it('Accepts valid set router message', async () => {
    // Create address for router to enroll and domain for router
    const [router] = provider.getWallets();

    // Create SetRouter message
    const setRouterMessage = optics.governance.formatSetRouter(
      thirdDomain,
      optics.ethersAddressToBytes32(router.address),
    );

    const opticsMessage = await formatOpticsMessage(
      governorReplicaOnNonGovernorChain,
      governorRouter,
      nonGovernorRouter,
      setRouterMessage,
    );

    // Expect successful tx
    let success = await governorReplicaOnNonGovernorChain.callStatic.process(
      opticsMessage,
    );
    expect(success).to.be.true;

    // Expect new router to be registered for domain and for new domain to be
    // in domains array
    await governorReplicaOnNonGovernorChain.process(opticsMessage);
    expect(await nonGovernorRouter.routers(thirdDomain)).to.equal(
      optics.ethersAddressToBytes32(router.address),
    );
    expect(await nonGovernorRouter.containsDomain(thirdDomain)).to.be.true;
  });

  it('Accepts valid call messages', async () => {
    // const TestRecipient = await optics.deployImplementation('TestRecipient');
    const testRecipientFactory = new contracts.TestRecipient__factory(signer);
    const TestRecipient = await testRecipientFactory.deploy();

    // Format optics call message
    const arg = 'String!';
    const call = await formatCall(TestRecipient, 'receiveString', [arg]);

    // Create Call message to test recipient that calls receiveString
    const callMessage = optics.governance.formatCalls([call, call]);

    const opticsMessage = await formatOpticsMessage(
      governorReplicaOnNonGovernorChain,
      governorRouter,
      nonGovernorRouter,
      callMessage,
    );

    // Expect successful tx
    let success =
      await governorReplicaOnNonGovernorChain.callStatic.testProcess(
        opticsMessage,
      );

    expect(success).to.be.true;
  });

  it('Transfers governorship', async () => {
    // Transfer governor on current governor chain
    // get root on governor chain before transferring governor
    const currentRoot = await governorHome.current();

    // Governor HAS NOT been transferred on original governor domain
    await expectGovernor(governorRouter, governorDomain, firstGovernor);
    // Governor HAS NOT been transferred on original non-governor domain
    await expectGovernor(
      nonGovernorRouter,
      governorDomain,
      ethers.constants.AddressZero,
    );

    // transfer governorship to nonGovernorRouter
    await governorRouter.transferGovernor(nonGovernorDomain, secondGovernor);

    // Governor HAS been transferred on original governor domain
    await expectGovernor(
      governorRouter,
      nonGovernorDomain,
      ethers.constants.AddressZero,
    );
    // Governor HAS NOT been transferred on original non-governor domain
    await expectGovernor(
      nonGovernorRouter,
      governorDomain,
      ethers.constants.AddressZero,
    );

    // get new root and signed update
    const newRoot = await governorHome.queueEnd();

    const { signature } = await updater.signUpdate(currentRoot, newRoot);

    // update governor chain home
    await governorHome.update(currentRoot, newRoot, signature);

    const transferGovernorMessage = optics.governance.formatTransferGovernor(
      nonGovernorDomain,
      optics.ethersAddressToBytes32(secondGovernor),
    );

    const opticsMessage = await formatOpticsMessage(
      governorReplicaOnNonGovernorChain,
      governorRouter,
      nonGovernorRouter,
      transferGovernorMessage,
    );

    // Set current root on replica
    await governorReplicaOnNonGovernorChain.setCurrentRoot(newRoot);

    // Governor HAS been transferred on original governor domain
    await expectGovernor(
      governorRouter,
      nonGovernorDomain,
      ethers.constants.AddressZero,
    );
    // Governor HAS NOT been transferred on original non-governor domain
    await expectGovernor(
      nonGovernorRouter,
      governorDomain,
      ethers.constants.AddressZero,
    );

    // Process transfer governor message on Replica
    await governorReplicaOnNonGovernorChain.process(opticsMessage);

    // Governor HAS been transferred on original governor domain
    await expectGovernor(
      governorRouter,
      nonGovernorDomain,
      ethers.constants.AddressZero,
    );
    // Governor HAS been transferred on original non-governor domain
    await expectGovernor(nonGovernorRouter, nonGovernorDomain, secondGovernor);
  });

  it('Upgrades using GovernanceRouter call', async () => {
    const deploy = deploys[0];

    const mysteryMath = await upgradeUtils.deployMysteryMathUpgradeSetup(
      deploy,
      signer,
    );

    const upgradeBeaconController = deploy.contracts.upgradeBeaconController!;

    // expect results before upgrade
    await upgradeUtils.expectMysteryMathV1(mysteryMath.proxy);

    // Deploy Implementation 2
    const v2Factory = new contracts.MysteryMathV2__factory(signer);
    const implementation = await v2Factory.deploy();

    // Format optics call message
    const call = await formatCall(upgradeBeaconController, 'upgrade', [
      mysteryMath.beacon.address,
      implementation.address,
    ]);

    // dispatch call on local governorRouter
    await expect(governorRouter.callLocal([call])).to.emit(
      upgradeBeaconController,
      'BeaconUpgraded',
    );

    // test implementation was upgraded
    await upgradeUtils.expectMysteryMathV2(mysteryMath.proxy);
  });

  it('Sends cross-chain message to upgrade contract', async () => {
    const deploy = deploys[1];

    const mysteryMath = await upgradeUtils.deployMysteryMathUpgradeSetup(
      deploy,
      signer,
    );

    const upgradeBeaconController = deploy.contracts.upgradeBeaconController!;

    // expect results before upgrade
    await upgradeUtils.expectMysteryMathV1(mysteryMath.proxy);

    // Deploy Implementation 2
    const factory2 = new contracts.MysteryMathV2__factory(signer);
    const implementation2 = await factory2.deploy();

    // Format optics call message
    const call = await formatCall(upgradeBeaconController, 'upgrade', [
      mysteryMath.beacon.address,
      implementation2.address,
    ]);

    const currentRoot = await governorHome.current();

    // dispatch call on local governorRouter
    await governorRouter.callRemote(nonGovernorDomain, [call]);

    const [, latestRoot] = await governorHome.suggestUpdate();

    const { signature } = await updater.signUpdate(currentRoot, latestRoot);

    await expect(governorHome.update(currentRoot, latestRoot, signature))
      .to.emit(governorHome, 'Update')
      .withArgs(governorDomain, currentRoot, latestRoot, signature);

    expect(await governorHome.current()).to.equal(latestRoot);
    expect(await governorHome.queueContains(latestRoot)).to.be.false;

    await enqueueUpdateToReplica(
      { oldRoot: currentRoot, newRoot: latestRoot, signature },
      governorReplicaOnNonGovernorChain,
    );

    const [pending] = await governorReplicaOnNonGovernorChain.nextPending();
    expect(pending).to.equal(latestRoot);

    // Increase time enough for both updates to be confirmable
    const optimisticSeconds = deploys[0].chain.optimisticSeconds;
    await testUtils.increaseTimestampBy(provider, optimisticSeconds * 2);

    // Replica should be able to confirm updates
    expect(await governorReplicaOnNonGovernorChain.canConfirm()).to.be.true;

    await governorReplicaOnNonGovernorChain.confirm();

    // after confirming, current root should be equal to the last submitted update
    expect(await governorReplicaOnNonGovernorChain.current()).to.equal(
      latestRoot,
    );

    const callMessage = optics.governance.formatCalls([call]);

    const sequence = await governorHome.sequences(governorDomain);
    const opticsMessage = optics.formatMessage(
      governorDomain,
      governorRouter.address,
      sequence,
      nonGovernorDomain,
      nonGovernorRouter.address,
      callMessage,
    );

    const { path } = proof;
    const index = 0;
    await governorReplicaOnNonGovernorChain.proveAndProcess(
      opticsMessage,
      path,
      index,
    );

    // test implementation was upgraded
    await upgradeUtils.expectMysteryMathV2(mysteryMath.proxy);
  });

  it('Calls UpdaterManager to change the Updater on Home', async () => {
    const [newUpdater] = provider.getWallets();
    const updaterManager = deploys[0].contracts.updaterManager!;

    // check current Updater address on Home
    let currentUpdaterAddr = await governorHome.updater();
    expect(currentUpdaterAddr).to.equal(deploys[0].chain.updater);

    // format optics call message
    const call = await formatCall(updaterManager, 'setUpdater', [
      newUpdater.address,
    ]);

    await expect(governorRouter.callLocal([call])).to.emit(
      governorHome,
      'NewUpdater',
    );

    // check for new updater
    currentUpdaterAddr = await governorHome.updater();
    expect(currentUpdaterAddr).to.equal(newUpdater.address);
  });
});

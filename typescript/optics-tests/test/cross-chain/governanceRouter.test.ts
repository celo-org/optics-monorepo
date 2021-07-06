import { ethers, waffle, optics } from 'hardhat';
const { provider } = waffle;
import { expect } from 'chai';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import {
  enqueueUpdateToReplica,
  formatCall,
  formatOpticsMessage,
} from './utils';
import testUtils from '../utils';
import { getTestDeploy } from '../testChain';
import { Updater } from '../../lib';
import { Address } from '../../lib/types';
import { Deploy } from '../../../optics-deploy/src/chain';
import {
  deployTwoChains,
  deployUnenrolledReplica,
  deployUpdaterManager,
  deployUpgradeBeaconController,
} from '../../../optics-deploy/src/deployOptics';
import * as contracts from '../../../typechain/optics-core';

const { proof } = require('../../../../vectors/proof.json');

/*
 * Deploy the full Optics suite on two chains
 */
describe('GovernanceRouter', async () => {
  const domains = [1000, 2000];
  const governorDomain = 1000;
  const nonGovernorDomain = 2000;
  const thirdDomain = 3000;
  const walletProvider = new testUtils.WalletProvider(provider);
  const [thirdRouter, recoveryManager] = walletProvider.getWalletsPersistent(2);
  let deploys: Deploy[] = [];

  let governorRouter: contracts.TestGovernanceRouter,
    governorHome: contracts.Home,
    governorReplicaOnNonGovernorChain: contracts.TestReplica,
    nonGovernorRouter: contracts.TestGovernanceRouter,
    nonGovernorReplicaOnGovernorChain: contracts.TestReplica,
    firstGovernor: Address,
    secondGovernor: Address,
    signer: SignerWithAddress,
    secondGovernorSigner: SignerWithAddress,
    updater: Updater;

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
    [signer, secondGovernorSigner] = walletProvider.getWalletsPersistent(2);
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
    const optimisticSeconds = 3;
    const initialCurrentRoot = ethers.utils.formatBytes32String('current');
    const initialIndex = 0;
    const controller = null;

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

  // it.only('Transfers governorship', async () => {
  //   // Transfer governor on current governor chain
  //   // get root on governor chain before transferring governor
  //   const currentRoot = await governorHome.current();

  //   // Governor HAS NOT been transferred on original governor domain
  //   await expectGovernor(governorRouter, governorDomain, firstGovernor);
  //   // Governor HAS NOT been transferred on original non-governor domain
  //   await expectGovernor(
  //     nonGovernorRouter,
  //     governorDomain,
  //     ethers.constants.AddressZero,
  //   );
  //   console.log(1);

  //   // transfer governorship to nonGovernorRouter
  //   await governorRouter.transferGovernor(nonGovernorDomain, secondGovernor);

  //   // Governor HAS been transferred on original governor domain
  //   await expectGovernor(
  //     governorRouter,
  //     nonGovernorDomain,
  //     ethers.constants.AddressZero,
  //   );
  //   // Governor HAS NOT been transferred on original non-governor domain
  //   await expectGovernor(
  //     nonGovernorRouter,
  //     governorDomain,
  //     ethers.constants.AddressZero,
  //   );
  //   console.log(2);

  //   // get new root and signed update
  //   const newRoot = await governorHome.queueEnd();
  //   console.log(2.1);
  //   const { signature } = await updater.signUpdate(currentRoot, newRoot);
  //   console.log(2.2);
  //   console.log({ currentRoot, newRoot, signature });

  //   // update governor chain home
  //   await governorHome.update(currentRoot, newRoot, signature);
  //   console.log(2.5);

  //   const transferGovernorMessage = optics.governance.formatTransferGovernor(
  //     nonGovernorDomain,
  //     optics.ethersAddressToBytes32(secondGovernor),
  //   );

  //   const opticsMessage = await formatOpticsMessage(
  //     governorReplicaOnNonGovernorChain,
  //     governorRouter,
  //     nonGovernorRouter,
  //     transferGovernorMessage,
  //   );
  //   console.log(3);

  //   // Set current root on replica
  //   await governorReplicaOnNonGovernorChain.setCurrentRoot(newRoot);

  //   // Governor HAS been transferred on original governor domain
  //   await expectGovernor(
  //     governorRouter,
  //     nonGovernorDomain,
  //     ethers.constants.AddressZero,
  //   );
  //   // Governor HAS NOT been transferred on original non-governor domain
  //   await expectGovernor(
  //     nonGovernorRouter,
  //     governorDomain,
  //     ethers.constants.AddressZero,
  //   );
  //   console.log(4);

  //   // Process transfer governor message on Replica
  //   await governorReplicaOnNonGovernorChain.process(opticsMessage);
  //   // const [success, ret] = await governorReplicaOnNonGovernorChain.process(opticsMessage);
  //   console.log(5);

  //   // Governor HAS been transferred on original governor domain
  //   await expectGovernor(
  //     governorRouter,
  //     nonGovernorDomain,
  //     ethers.constants.AddressZero,
  //   );
  //   // Governor HAS been transferred on original non-governor domain
  //   await expectGovernor(nonGovernorRouter, nonGovernorDomain, secondGovernor);
  // });

  // it.only('Upgrades using GovernanceRouter call', async () => {
  //   const a = 5;
  //   const b = 10;
  //   const stateVar = 17;

  //   // TODO: extrapolate logic
  //   // set up fresh test deploy
  //   const deploy = deploys[0];

  //   // deploy implementation
  //   const mysteryMathFactory = new contracts.MysteryMathV1__factory(signer);
  //   const mysteryMathImplementation = await mysteryMathFactory.deploy();

  //   const upgradeBeaconController = deploy.contracts.upgradeBeaconController!;

  //   // deploy and set upgrade beacon
  //   // TODO: something wrong with upgrade beacon
  //   const beaconFactory = new contracts.UpgradeBeacon__factory(
  //     deploy.chain.deployer,
  //   );
  //   const upgradeBeacon = await beaconFactory.deploy(
  //     mysteryMathImplementation.address,
  //     upgradeBeaconController.address,
  //     { gasPrice: deploy.chain.gasPrice, gasLimit: 2_000_000 },
  //   );

  //   // deploy proxy
  //   let factory = new contracts.UpgradeBeaconProxy__factory(
  //     deploy.chain.deployer,
  //   );
  //   const upgradeBeaconProxy = await factory.deploy(upgradeBeacon.address, [], {
  //     gasPrice: deploy.chain.gasPrice,
  //     gasLimit: 1_000_000,
  //   });

  //   // set proxy
  //   const mysteryMathProxy = mysteryMathFactory.attach(
  //     upgradeBeaconProxy.address,
  //   );

  //   // Set state of proxy
  //   await mysteryMathProxy.setState(stateVar);

  //   // expect results before upgrade
  //   let versionResult = await mysteryMathProxy.version();
  //   expect(versionResult).to.equal(1);
  //   let mathResult = await mysteryMathProxy.doMath(a, b);
  //   expect(mathResult).to.equal(a + b);
  //   let stateResult = await mysteryMathProxy.getState();
  //   expect(stateResult).to.equal(stateVar);

  //   // Deploy Implementation 2
  //   const v2Factory = new contracts.MysteryMathV2__factory(signer);
  //   const implementation = await v2Factory.deploy();

  //   // Format optics call message
  //   const call = await formatCall(upgradeBeaconController, 'upgrade', [
  //     upgradeBeaconProxy.address,
  //     implementation.address,
  //   ]);
  //   console.log(upgradeBeaconProxy.address);
  //   console.log(implementation.address);
  //   console.log(call);

  //   console.log('before');
  //   // dispatch call on local governorRouter
  //   const ret = await expect(governorRouter.callLocal([call])).to.emit(
  //     upgradeBeaconController,
  //     'BeaconUpgraded',
  //   );
  //   console.log(ret);
  //   console.log('after');

  //   // test implementation was upgraded
  //   versionResult = await mysteryMathProxy.version();
  //   expect(versionResult).to.equal(2);

  //   mathResult = await mysteryMathProxy.doMath(a, b);
  //   expect(mathResult).to.equal(a * b);

  //   stateResult = await mysteryMathProxy.getState();
  //   expect(stateResult).to.equal(stateVar);
  // });

  // it('Sends cross-chain message to upgrade contract', async () => {
  //   const a = 5;
  //   const b = 10;
  //   const stateVar = 17;

  //   const upgradeBeaconController =
  //     deploys[1].contracts.upgradeBeaconController!;

  //   // SETUP CONTRACT SUITE
  //   // set up fresh test deploy
  //   const deploy = await getTestDeploy(1000, ethers.constants.AddressZero, []);

  //   // deploy implementation
  //   const mysteryMathFactory = new contracts.MysteryMathV1__factory(signer);
  //   const implementation1 = await mysteryMathFactory.deploy();

  //   // deploy and set upgrade beacon
  //   const beaconFactory = new contracts.UpgradeBeacon__factory(
  //     deploy.chain.deployer,
  //   );
  //   const upgradeBeacon = await beaconFactory.deploy(
  //     implementation1.address,
  //     upgradeBeaconController.address,
  //     { gasPrice: deploy.chain.gasPrice, gasLimit: 2_000_000 },
  //   );

  //   // deploy proxy
  //   let factory = new contracts.UpgradeBeaconProxy__factory(
  //     deploy.chain.deployer,
  //   );
  //   const upgradeBeaconProxy = await factory.deploy(upgradeBeacon.address, []);

  //   // set proxy
  //   const mysteryMathProxy = mysteryMathFactory.attach(
  //     upgradeBeaconProxy.address,
  //   );

  //   // Set state of proxy
  //   await mysteryMathProxy.setState(stateVar);

  //   // expect results before upgrade
  //   let versionResult = await mysteryMathProxy.version();
  //   expect(versionResult).to.equal(1);
  //   let mathResult = await mysteryMathProxy.doMath(a, b);
  //   expect(mathResult).to.equal(a + b);
  //   let stateResult = await mysteryMathProxy.getState();
  //   expect(stateResult).to.equal(stateVar);

  //   // Deploy Implementation 2
  //   const factory2 = new contracts.MysteryMathV2__factory(signer);
  //   const implementation2 = await factory2.deploy();

  //   // Format optics call message
  //   const call = await formatCall(upgradeBeaconController, 'upgrade', [
  //     upgradeBeacon.address,
  //     implementation2.address,
  //   ]);

  //   const currentRoot = await governorHome.current();

  //   // dispatch call on local governorRouter
  //   governorRouter.callRemote(nonGovernorDomain, [call]);

  //   const [, latestRoot] = await governorHome.suggestUpdate();

  //   const { signature } = await updater.signUpdate(currentRoot, latestRoot);

  //   await expect(governorHome.update(currentRoot, latestRoot, signature))
  //     .to.emit(governorHome, 'Update')
  //     .withArgs(governorDomain, currentRoot, latestRoot, signature);

  //   expect(await governorHome.current()).to.equal(latestRoot);
  //   expect(await governorHome.queueContains(latestRoot)).to.be.false;

  //   await enqueueUpdateToReplica(
  //     { oldRoot: currentRoot, newRoot: latestRoot, signature },
  //     deploys[1].contracts.replicas[governorDomain].proxy,
  //   );

  //   const [pending] = await governorReplicaOnNonGovernorChain.nextPending();
  //   expect(pending).to.equal(latestRoot);

  //   // Increase time enough for both updates to be confirmable
  //   const optimisticSeconds = deploys[0].chain.optimisticSeconds;
  //   await testUtils.increaseTimestampBy(provider, optimisticSeconds * 2);

  //   // Replica should be able to confirm updates
  //   expect(await governorReplicaOnNonGovernorChain.canConfirm()).to.be.true;

  //   await governorReplicaOnNonGovernorChain.confirm();

  //   // after confirming, current root should be equal to the last submitted update
  //   expect(await governorReplicaOnNonGovernorChain.current()).to.equal(
  //     latestRoot,
  //   );

  //   const callMessage = optics.governance.formatCalls([call]);

  //   const opticsMessage = optics.formatMessage(
  //     governorDomain,
  //     governorRouter.address,
  //     0,
  //     nonGovernorDomain,
  //     nonGovernorRouter.address,
  //     callMessage,
  //   );

  //   const { path } = proof;
  //   const index = 0;
  //   await governorReplicaOnNonGovernorChain.proveAndProcess(
  //     opticsMessage,
  //     path,
  //     index,
  //   );

  //   // test implementation was upgraded
  //   versionResult = await mysteryMathProxy.version();
  //   expect(versionResult).to.equal(2);

  //   mathResult = await mysteryMathProxy.doMath(a, b);
  //   expect(mathResult).to.equal(a * b);

  //   stateResult = await mysteryMathProxy.getState();
  //   expect(stateResult).to.equal(stateVar);
  // });

  it('Calls UpdaterManager to change the Updater on Home', async () => {
    const [newUpdater] = provider.getWallets();
    // const updaterManager = getUpdaterManager(chainDetails, governorDomain);
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

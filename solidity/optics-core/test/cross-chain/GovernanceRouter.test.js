const { ethers } = require('hardhat');
const { provider } = waffle;
const { expect } = require('chai');
const { domainsToTestConfigs } = require('./generateTestChainConfigs');
const testUtils = require('../utils');
const {
  enqueueUpdateToReplica,
  formatCall,
  formatOpticsMessage,
} = require('./crossChainTestUtils');
const {
  deployMultipleChains,
  getHome,
  getReplica,
  getGovernanceRouter,
  getUpgradeBeaconController,
  getUpdaterManager,
} = require('./deployCrossChainTest');
const { proof } = require('../../../../vectors/proof.json');

/*
 * Deploy the full Optics suite on two chains
 */
describe('GovernanceRouter', async () => {
  const domains = [1000, 2000];
  const governorDomain = 1000;
  const nonGovernorDomain = 2000;
  const thirdDomain = 3000;
  const [thirdRouter] = provider.getWallets();
  let governorRouter,
    governorHome,
    governorReplicaOnNonGovernorChain,
    nonGovernorRouter,
    nonGovernorReplicaOnGovernorChain,
    firstGovernor,
    secondGovernor,
    secondGovernorSigner,
    updater,
    chainDetails;

  async function expectGovernor(
    governanceRouter,
    expectedGovernorDomain,
    expectedGovernor,
  ) {
    expect(await governanceRouter.governorDomain()).to.equal(
      expectedGovernorDomain,
    );
    expect(await governanceRouter.governor()).to.equal(expectedGovernor);
  }

  beforeEach(async () => {
    // generate TestChainConfigs for the given domains
    const configs = await domainsToTestConfigs(domains);

    // deploy the entire Optics suite on each chain
    chainDetails = await deployMultipleChains(configs);

    // set updater
    [signer, secondGovernorSigner] = provider.getWallets();
    updater = await optics.Updater.fromSigner(signer, governorDomain);

    // get both governanceRouters
    governorRouter = getGovernanceRouter(chainDetails, governorDomain);
    nonGovernorRouter = getGovernanceRouter(chainDetails, nonGovernorDomain);

    firstGovernor = await governorRouter.governor();
    secondGovernor = await secondGovernorSigner.getAddress();

    governorHome = getHome(chainDetails, governorDomain);
    governorReplicaOnNonGovernorChain = getReplica(
      chainDetails,
      nonGovernorDomain,
      governorDomain,
    );
    nonGovernorReplicaOnGovernorChain = getReplica(
      chainDetails,
      governorDomain,
      nonGovernorDomain,
    );
  });

  it('Rejects message from unenrolled replica', async () => {
    const optimisticSeconds = 3;
    const initialCurrentRoot = ethers.utils.formatBytes32String('current');
    const initialLastProcessed = 0;
    const controller = null;

    // Deploy single replica on nonGovernorDomain that will not be enrolled
    const { contracts: unenrolledReplicaContracts } =
      await optics.deployUpgradeSetupAndProxy(
        'TestReplica',
        [nonGovernorDomain],
        [
          nonGovernorDomain,
          updater.signer.address,
          initialCurrentRoot,
          optimisticSeconds,
          initialLastProcessed,
        ],
        controller,
        'initialize(uint32, address, bytes32, uint256, uint256)',
      );
    const unenrolledReplica =
      unenrolledReplicaContracts.proxyWithImplementation;

    // Create TransferGovernor message
    const transferGovernorMessage =
      optics.GovernanceRouter.formatTransferGovernor(
        thirdDomain,
        optics.ethersAddressToBytes32(secondGovernor),
      );

    const opticsMessage = await formatOpticsMessage(
      unenrolledReplica,
      governorRouter,
      nonGovernorRouter,
      transferGovernorMessage,
    );

    // Expect replica processing to fail when nonGovernorRouter reverts in
    // handle
    let [success, ret] = await unenrolledReplica.callStatic.testProcess(
      opticsMessage,
    );
    expect(success).to.be.false;
    expect(ret).to.equal('!replica');
  });

  it('Rejects message not from governor router', async () => {
    // Create TransferGovernor message
    const transferGovernorMessage =
      optics.GovernanceRouter.formatTransferGovernor(
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

    // Expect replica processing to fail when nonGovernorRouter reverts in
    // handle
    let [success, ret] =
      await nonGovernorReplicaOnGovernorChain.callStatic.testProcess(
        opticsMessage,
      );
    expect(success).to.be.false;
    expect(ret).to.equal('!governorRouter');
  });

  it('Accepts a valid transfer governor message', async () => {
    // Enroll router for new domain (in real setting this would
    // be executed with an Optics message sent to the nonGovernorRouter)
    await nonGovernorRouter.testSetRouter(
      thirdDomain,
      optics.ethersAddressToBytes32(thirdRouter.address),
    );

    // Create TransferGovernor message
    const transferGovernorMessage =
      optics.GovernanceRouter.formatTransferGovernor(
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
    let [success] = await governorReplicaOnNonGovernorChain.callStatic.process(
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
    const setRouterMessage = optics.GovernanceRouter.formatSetRouter(
      thirdDomain,
      optics.ethersAddressToBytes32(router.address),
    );

    const opticsMessage = formatOpticsMessage(
      governorReplicaOnNonGovernorChain,
      governorRouter,
      nonGovernorRouter,
      setRouterMessage,
    );

    // Expect successful tx
    let [success] = await governorReplicaOnNonGovernorChain.callStatic.process(
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
    const TestRecipient = await optics.deployImplementation('TestRecipient');

    // Format optics call message
    const arg = 'String!';
    const call = await formatCall(TestRecipient, 'receiveString', [arg]);

    // Create Call message to test recipient that calls receiveString
    const callMessage = optics.GovernanceRouter.formatCalls([call, call]);

    const opticsMessage = await formatOpticsMessage(
      governorReplicaOnNonGovernorChain,
      governorRouter,
      nonGovernorRouter,
      callMessage,
    );

    // Expect successful tx
    let [success, ret] =
      await governorReplicaOnNonGovernorChain.callStatic.testProcess(
        opticsMessage,
      );
    expect(success).to.be.true;
    expect(ret).to.be.empty;
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

    const transferGovernorMessage =
      optics.GovernanceRouter.formatTransferGovernor(
        nonGovernorDomain,
        optics.ethersAddressToBytes32(secondGovernor),
      );

    const opticsMessage = formatOpticsMessage(
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
    const a = 5;
    const b = 10;
    const stateVar = 17;

    // get upgradeBeaconController
    const upgradeBeaconController = getUpgradeBeaconController(
      chainDetails,
      governorDomain,
    );

    // Set up contract suite
    const { contracts } = await optics.deployUpgradeSetupAndProxy(
      'MysteryMathV1',
      [],
      [],
      upgradeBeaconController,
    );
    const mysteryMathProxy = contracts.proxyWithImplementation;
    const upgradeBeacon = contracts.upgradeBeacon;

    // Set state of proxy
    await mysteryMathProxy.setState(stateVar);

    // expect results before upgrade
    let versionResult = await mysteryMathProxy.version();
    expect(versionResult).to.equal(1);
    let mathResult = await mysteryMathProxy.doMath(a, b);
    expect(mathResult).to.equal(a + b);
    let stateResult = await mysteryMathProxy.getState();
    expect(stateResult).to.equal(stateVar);

    // Deploy Implementation 2
    const implementation = await optics.deployImplementation('MysteryMathV2');

    // Format optics call message
    const call = await formatCall(upgradeBeaconController, 'upgrade', [
      upgradeBeacon.address,
      implementation.address,
    ]);

    // dispatch call on local governorRouter
    await expect(governorRouter.callLocal([call])).to.emit(
      upgradeBeaconController,
      'BeaconUpgraded',
    );

    // test implementation was upgraded
    versionResult = await mysteryMathProxy.version();
    expect(versionResult).to.equal(2);

    mathResult = await mysteryMathProxy.doMath(a, b);
    expect(mathResult).to.equal(a * b);

    stateResult = await mysteryMathProxy.getState();
    expect(stateResult).to.equal(stateVar);
  });

  it('Sends cross-chain message to upgrade contract', async () => {
    const a = 5;
    const b = 10;
    const stateVar = 17;

    // get upgradeBeaconController
    const upgradeBeaconController = getUpgradeBeaconController(
      chainDetails,
      nonGovernorDomain,
    );

    // Set up contract suite
    const { contracts } = await optics.deployUpgradeSetupAndProxy(
      'MysteryMathV1',
      [],
      [],
      upgradeBeaconController,
    );
    const mysteryMathProxy = contracts.proxyWithImplementation;
    const upgradeBeacon = contracts.upgradeBeacon;

    // Set state of proxy
    await mysteryMathProxy.setState(stateVar);

    // expect results before upgrade
    let versionResult = await mysteryMathProxy.version();
    expect(versionResult).to.equal(1);
    let mathResult = await mysteryMathProxy.doMath(a, b);
    expect(mathResult).to.equal(a + b);
    let stateResult = await mysteryMathProxy.getState();
    expect(stateResult).to.equal(stateVar);

    // Deploy Implementation 2
    const implementation = await optics.deployImplementation('MysteryMathV2');

    // Format optics call message
    const call = await formatCall(upgradeBeaconController, 'upgrade', [
      upgradeBeacon.address,
      implementation.address,
    ]);

    const currentRoot = await governorHome.current();

    // dispatch call on local governorRouter
    governorRouter.callRemote(nonGovernorDomain, [call]);

    const [, latestRoot] = await governorHome.suggestUpdate();

    const { signature } = await updater.signUpdate(currentRoot, latestRoot);

    await expect(governorHome.update(currentRoot, latestRoot, signature))
      .to.emit(governorHome, 'Update')
      .withArgs(governorDomain, currentRoot, latestRoot, signature);

    expect(await governorHome.current()).to.equal(latestRoot);
    expect(await governorHome.queueContains(latestRoot)).to.be.false;

    await enqueueUpdateToReplica(
      chainDetails,
      { startRoot: currentRoot, finalRoot: latestRoot, signature },
      governorDomain,
      nonGovernorDomain,
    );

    const [pending] = await governorReplicaOnNonGovernorChain.nextPending();
    expect(pending).to.equal(latestRoot);

    // Increase time enough for both updates to be confirmable
    const optimisticSeconds = chainDetails[nonGovernorDomain].optimisticSeconds;
    await testUtils.increaseTimestampBy(provider, optimisticSeconds * 2);

    // Replica should be able to confirm updates
    expect(await governorReplicaOnNonGovernorChain.canConfirm()).to.be.true;

    await governorReplicaOnNonGovernorChain.confirm();

    // after confirming, current root should be equal to the last submitted update
    expect(await governorReplicaOnNonGovernorChain.current()).to.equal(
      latestRoot,
    );

    const callMessage = optics.GovernanceRouter.formatCalls([call]);

    const opticsMessage = optics.formatMessage(
      governorDomain,
      governorRouter.address,
      1,
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
    versionResult = await mysteryMathProxy.version();
    expect(versionResult).to.equal(2);

    mathResult = await mysteryMathProxy.doMath(a, b);
    expect(mathResult).to.equal(a * b);

    stateResult = await mysteryMathProxy.getState();
    expect(stateResult).to.equal(stateVar);
  });

  it('Calls UpdaterManager to change the Updater on Home', async () => {
    const [newUpdater] = provider.getWallets();
    const updaterManager = getUpdaterManager(chainDetails, governorDomain);

    // check current Updater address on Home
    let currentUpdaterAddr = await governorHome.updater();
    expect(currentUpdaterAddr).to.equal(updater.signer.address);

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

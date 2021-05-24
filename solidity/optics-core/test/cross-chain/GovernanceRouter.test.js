const { ethers } = require('hardhat');
const { provider } = waffle;
const { expect } = require('chai');
const { domainsToTestConfigs } = require('./generateTestChainConfigs');
const { formatOpticsMessage } = require('./crossChainTestUtils');
const {
  deployMultipleChains,
  getHome,
  getReplica,
  getGovernanceRouter,
} = require('./deployCrossChainTest');

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
    let secondGovernorSigner;
    [signer, secondGovernorSigner] = provider.getWallets();
    updater = await optics.Updater.fromSigner(signer, governorDomain);

    // get both governanceRouters
    governorRouter = getGovernanceRouter(chainDetails, governorDomain);
    nonGovernorRouter = getGovernanceRouter(chainDetails, nonGovernorDomain);

    // set remote governance router addresses
    governorRouter.setRouterAddress(
      nonGovernorDomain,
      nonGovernorRouter.address,
    );
    nonGovernorRouter.setRouterAddress(governorDomain, governorRouter.address);

    // transfer governorship to governor router on non governor router
    firstGovernor = await governorRouter.governor();
    nonGovernorRouter.transferGovernor(governorDomain, firstGovernor);

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
    // Create address for router to enroll and domain for router
    const testRecipient = await optics.deployImplementation('TestRecipient');

    const TestRecipient = await ethers.getContractFactory('TestRecipient');
    const string = 'String!';
    const receiveStringFunction =
      TestRecipient.interface.getFunction('receiveString');
    const receiveStringEncoded = TestRecipient.interface.encodeFunctionData(
      receiveStringFunction,
      [string],
    );
    const receiveStringEncodedLength = await nonGovernorRouter.getMessageLength(
      receiveStringEncoded,
    );

    const callData = {
      to: optics.ethersAddressToBytes32(testRecipient.address),
      dataLen: receiveStringEncodedLength,
      data: receiveStringEncoded,
    };

    // Create Call message to test recipient that calls receiveString
    const callMessage = optics.GovernanceRouter.formatCalls([
      callData,
      callData,
    ]);

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
});

const { ethers } = require('hardhat');
const { provider } = waffle;
const { expect } = require('chai');
const { domainsToTestConfigs } = require('./generateTestChainConfigs');
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
  const nonGovernorDomain = 2000;
  const governorDomain = 1000;
  let governorRouter,
    governorHome,
    governorReplicaOnNonGovernorChain,
    nonGovernorRouter,
    nonGovernorHome,
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

    nonGovernorHome = getHome(chainDetails, nonGovernorDomain);
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
    const {
      contracts: unenrolledReplicaContracts,
    } = await optics.deployUpgradeSetupAndProxy(
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
    const newDomain = 3000;
    const transferGovernorMessage = optics.GovernanceRouter.formatTransferGovernor(
      newDomain,
      optics.ethersAddressToBytes32(secondGovernor),
    );

    // Some sender on governor domain tries to send transferGovernorMessage to
    // nonGovernorRouter
    const opticsMessage = optics.formatMessage(
      governorDomain,
      governorRouter.address,
      1,
      nonGovernorDomain,
      nonGovernorRouter.address,
      transferGovernorMessage,
    );

    // Set message status to MessageStatus.Pending
    await unenrolledReplica.setMessagePending(opticsMessage);

    // Expect replica processing to fail when nonGovernorRouter reverts in
    // handle
    let [success, ret] = await unenrolledReplica.callStatic.testProcess(
      opticsMessage,
    );
    expect(success).to.be.false;
    expect(ret).to.equal('!replica');
  });

  it('Rejects message not from governor router', async () => {
    // Create addresses for the invalid governor router and attempted
    // newGovernor at newDomain 3000
    // const [fakeGovernorRouter, newGovernor] = provider.getWallets();
    // const newDomain = 3000;

    // Create TransferGovernor message
    const transferGovernorMessage = optics.GovernanceRouter.formatTransferGovernor(
      2000,
      optics.ethersAddressToBytes32(nonGovernorRouter.address),
    );

    const sequence = (
      await governorReplicaOnNonGovernorChain.lastProcessed()
    ).add(1);

    // Create Optics message where the fake governor router tries
    // to send TransferGovernor message to the nonGovernorRouter
    // const fakeGovernorRouterDomain = 2000;
    const opticsMessage = optics.formatMessage(
      2000,
      nonGovernorRouter.address,
      sequence,
      1000,
      governorRouter.address,
      transferGovernorMessage,
    );

    // Set message status to MessageStatus.Pending
    await nonGovernorReplicaOnGovernorChain.setMessagePending(opticsMessage);

    // Expect replica processing to fail when nonGovernorRouter reverts in
    // handle
    let [
      success,
      ret,
    ] = await nonGovernorReplicaOnGovernorChain.callStatic.testProcess(
      opticsMessage,
    );
    expect(success).to.be.false;
    expect(ret).to.equal('!governorRouter');
  });

  it('Accepts a valid transfer governor message', async () => {
    // Create addresses for the new governor and the governanceRouter for the
    // new domain 3000
    const [newGovernor, newDomainRouter] = provider.getWallets();
    const newDomain = 3000;

    // Enroll router for newDomain (in real setting this would
    // be executed with an Optics message sent to the nonGovernorRouter)
    await nonGovernorRouter.testSetRouter(
      newDomain,
      optics.ethersAddressToBytes32(newDomainRouter.address),
    );

    // Create TransferGovernor message
    const transferGovernorMessage = optics.GovernanceRouter.formatTransferGovernor(
      newDomain,
      optics.ethersAddressToBytes32(newGovernor.address),
    );

    const sequence = (
      await governorReplicaOnNonGovernorChain.lastProcessed()
    ).add(1);

    // Create Optics message that is sent from the governor domain and governor
    // to the nonGovernorRouter on the nonGovernorDomain
    const opticsMessage = optics.formatMessage(
      governorDomain,
      governorRouter.address,
      sequence,
      nonGovernorDomain,
      nonGovernorRouter.address,
      transferGovernorMessage,
    );

    // Set message status to MessageStatus.Pending
    await governorReplicaOnNonGovernorChain.setMessagePending(opticsMessage);

    // Expect successful tx on static call
    let [success] = await governorReplicaOnNonGovernorChain.callStatic.process(
      opticsMessage,
    );
    expect(success).to.be.true;

    // Expect address(0) for governor since non-local and new domain to be 3000
    await governorReplicaOnNonGovernorChain.process(opticsMessage);
    expect(await nonGovernorRouter.governor()).to.equal(
      ethers.constants.AddressZero,
    );
    expect(await nonGovernorRouter.governorDomain()).to.equal(newDomain);
  });

  it('Accepts valid set router message', async () => {
    // Create address for router to enroll and domain for router
    const [router] = provider.getWallets();
    const routerDomain = 3000;

    // Create SetRouter message
    const setRouterMessage = optics.GovernanceRouter.formatSetRouter(
      routerDomain,
      optics.ethersAddressToBytes32(router.address),
    );

    const sequence = (
      await governorReplicaOnNonGovernorChain.lastProcessed()
    ).add(1);

    // Create Optics message that is sent from the governor domain and governor
    // to the nonGovernorRouter on the nonGovernorDomain
    const opticsMessage = optics.formatMessage(
      governorDomain,
      governorRouter.address,
      sequence,
      nonGovernorDomain,
      nonGovernorRouter.address,
      setRouterMessage,
    );

    // Set message status to MessageStatus.Pending
    await governorReplicaOnNonGovernorChain.setMessagePending(opticsMessage);

    // Expect successful tx
    let [success] = await governorReplicaOnNonGovernorChain.callStatic.process(
      opticsMessage,
    );
    expect(success).to.be.true;

    // Expect new router to be registered for domain and for new domain to be
    // in domains array
    await governorReplicaOnNonGovernorChain.process(opticsMessage);
    expect(await nonGovernorRouter.routers(routerDomain)).to.equal(
      optics.ethersAddressToBytes32(router.address),
    );
    expect(await nonGovernorRouter.domainsContains(routerDomain)).to.be.true;
  });

  it('Accepts valid call message', async () => {
    // Create address for router to enroll and domain for router
    const mockRecipient = await optics.deployImplementation('MockRecipient');

    const MockRecipient = await ethers.getContractFactory('MockRecipient');
    const string = 'String!';
    const receiveStringFunction = MockRecipient.interface.getFunction(
      'receiveString',
    );
    const receiveStringEncoded = MockRecipient.interface.encodeFunctionData(
      receiveStringFunction,
      [string],
    );

    // Create Call message to mockRecipient that calls receiveString
    const callMessage = optics.GovernanceRouter.formatCalls(
      [optics.ethersAddressToBytes32(mockRecipient.address)],
      [await nonGovernorRouter.getMessageLength(receiveStringEncoded)],
      [receiveStringEncoded],
    );

    // get current sequence on governor replica
    const sequence = (
      await governorReplicaOnNonGovernorChain.lastProcessed()
    ).add(1);

    // Create Optics message that is sent from the governor domain and governor
    // to the nonGovernorRouter on the nonGovernorDomain
    const opticsMessage = optics.formatMessage(
      governorDomain,
      governorRouter.address,
      sequence,
      nonGovernorDomain,
      nonGovernorRouter.address,
      callMessage,
    );

    // Set message status to MessageStatus.Pending
    await governorReplicaOnNonGovernorChain.setMessagePending(opticsMessage);

    // Expect successful tx
    let [
      success,
      ret,
    ] = await governorReplicaOnNonGovernorChain.callStatic.testProcess(
      opticsMessage,
    );
    console.log(ret);
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

    // get current sequence on governor replica
    const sequence = (
      await governorReplicaOnNonGovernorChain.lastProcessed()
    ).add(1);

    const transferGovernorMessage = optics.GovernanceRouter.formatTransferGovernor(
      nonGovernorDomain,
      optics.ethersAddressToBytes32(secondGovernor),
    );

    // format optics message
    const opticsMessage = optics.formatMessage(
      governorDomain,
      governorRouter.address,
      sequence,
      nonGovernorDomain,
      nonGovernorRouter.address,
      transferGovernorMessage,
    );

    // Set message status to MessageStatus.Pending
    await governorReplicaOnNonGovernorChain.setMessagePending(opticsMessage);
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

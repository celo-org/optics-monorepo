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
  let governorRouter, nonGovernorRouter, home, replica, replicaB, updater;

  before(async () => {
    // generate TestChainConfigs for the given domains
    const configs = await domainsToTestConfigs(domains);

    // deploy the entire Optics suite on each chain
    chainDetails = await deployMultipleChains(configs);

    // set updater
    [signer] = provider.getWallets();
    updater = await optics.Updater.fromSigner(signer, domains[0]);

    // get both governanceRouters
    governorRouter = getGovernanceRouter(chainDetails, domains[0]);
    nonGovernorRouter = getGovernanceRouter(chainDetails, domains[1]);

    // set routers
    governorRouter.setRouterAddress(domains[1], nonGovernorRouter.address);
    nonGovernorRouter.setRouterAddress(domains[0], governorRouter.address);

    // assign governorRouter to governor
    const governor = await governorRouter.governor();
    nonGovernorRouter.transferGovernor(domains[0], governor);

    home = getHome(chainDetails, domains[1]);
    replicaB = getReplica(chainDetails, domains[0], domains[1]);
    replica = getReplica(chainDetails, domains[1], domains[0]);
  });

  it('Rejects message from unenrolled replica', async () => {
    const optimisticSeconds = 3;
    const initialCurrentRoot = ethers.utils.formatBytes32String('current');
    const initialLastProcessed = 0;
    const controller = null;

    const [newGovernor] = provider.getWallets();

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
    unenrolledReplica = unenrolledReplicaContracts.proxyWithImplementation;

    // Create TransferGovernor message
    const newDomain = 3000;
    const transferGovernorMessage = optics.GovernanceRouter.formatTransferGovernor(
      newDomain,
      optics.ethersAddressToBytes32(newGovernor.address),
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

    // Create Optics message where the fake governor router tries
    // to send TransferGovernor message to the nonGovernorRouter
    // const fakeGovernorRouterDomain = 2000;
    const opticsMessage = optics.formatMessage(
      2000,
      nonGovernorRouter.address,
      1,
      1000,
      governorRouter.address,
      transferGovernorMessage,
    );

    // Set message status to MessageStatus.Pending
    await replicaB.setMessagePending(opticsMessage);

    // Expect replica processing to fail when nonGovernorRouter reverts in
    // handle
    let [success, ret] = await replicaB.callStatic.testProcess(opticsMessage);
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

    // Create Optics message that is sent from the governor domain and governor
    // to the nonGovernorRouter on the nonGovernorDomain
    const opticsMessage = optics.formatMessage(
      governorDomain,
      governorRouter.address,
      1,
      nonGovernorDomain,
      nonGovernorRouter.address,
      transferGovernorMessage,
    );

    // Set message status to MessageStatus.Pending
    await replica.setMessagePending(opticsMessage);

    // Expect successful tx on static call
    let [success] = await replica.callStatic.process(opticsMessage);
    expect(success).to.be.true;

    // Expect address(0) for governor since non-local and new domain to be 3000
    await replica.process(opticsMessage);
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

    const sequence = (await replica.lastProcessed()).add(1);

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
    await replica.setMessagePending(opticsMessage);

    // Expect successful tx
    let [success] = await replica.callStatic.process(opticsMessage);
    expect(success).to.be.true;

    // Expect new router to be registered for domain and for new domain to be
    // in domains array
    await replica.process(opticsMessage);
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

    // BUG: JS says length of data is 202 bytes but Solidity has data length
    // as only 100 bytes (this is why we have to call out to test contract
    // function getMessageLength)
    console.log(callMessage);
    console.log(
      'Solidity datalen: ',
      await nonGovernorRouter.getCallDataLen(callMessage),
    );
    console.log(
      'Solidity full msg len:',
      await nonGovernorRouter.getMessageLength(callMessage),
    );
    console.log(
      'Solidity datalen:',
      await nonGovernorRouter.getMessageLength(receiveStringEncoded),
    );

    // Create Optics message that is sent from the governor domain and governor
    // to the nonGovernorRouter on the nonGovernorDomain
    const opticsMessage = optics.formatMessage(
      governorDomain,
      governorRouter.address,
      1,
      nonGovernorDomain,
      nonGovernorRouter.address,
      callMessage,
    );

    // Set message status to MessageStatus.Pending
    await enrolledReplica.setMessagePending(opticsMessage);

    // Expect successful tx
    let [success, ret] = await enrolledReplica.callStatic.testProcess(
      opticsMessage,
    );
    console.log(ret);
    expect(success).to.be.true;
  });

  it('Transfers governorship', async () => {
    // const currentRoot = await home.current();

    // transfer governorship to nonGovernorRouter
    const governor = await governorRouter.governor();
    await governorRouter.transferGovernor(domains[1], governor);

    // // get new root and signed update
    const newRoot = await home.queueEnd();
    // console.log(currentRoot, newRoot);
    // const { signature } = await updater.signUpdate(currentRoot, newRoot);

    // // update home
    // home.update(currentRoot, newRoot, signature);

    // get current sequence
    const sequence = (await replica.lastProcessed()).add(1);

    const transferGovernorMessage = optics.GovernanceRouter.formatTransferGovernor(
      2000,
      optics.ethersAddressToBytes32(nonGovernorRouter.address),
    );

    // format optics message
    const opticsMessage = optics.formatMessage(
      domains[1],
      governorRouter.address,
      sequence,
      domains[0],
      nonGovernorRouter.address,
      transferGovernorMessage,
    );

    // Set message status to MessageStatus.Pending
    await replica.setMessagePending(opticsMessage);
    // Set current root on replica
    await replica.setCurrentRoot(newRoot);

    // TODO: prove
    let [success, ret] = await replica.callStatic.process(opticsMessage);
    expect(success).to.be.true;
    expect(ret).to.equal('hi');

    expect(
      governorRouter.interface.events[
        'TransferGovernor(uint32,uint32,address,address)'
      ].name,
    ).to.equal('TransferGovernor');

    expect(await governorRouter.governorDomain()).to.equal(domains[1]);
    expect(await governorRouter.governor()).to.equal(
      ethers.constants.AddressZero,
    );
    expect(await nonGovernorRouter.governorDomain()).to.equal(domains[1]);
    expect(await nonGovernorRouter.governor()).to.not.equal(
      ethers.constants.AddressZero,
    );
  });
});

const { waffle, ethers } = require('hardhat');
const { provider, deployMockContract } = waffle;
const { expect } = require('chai');
const UpdaterManager = require('../artifacts/contracts/UpdaterManager.sol/UpdaterManager.json');

const [governorRouter] = provider.getWallets();
const governorDomain = 1000;
const nonGovernorDomain = 2000;
const optimisticSeconds = 3;
const initialCurrentRoot = ethers.utils.formatBytes32String('current');
const initialLastProcessed = 0;
const controller = null;

describe('GovernanceRouter', async () => {
  let nonGovernorRouter,
    connectionManager,
    enrolledReplica,
    unenrolledReplica,
    signer,
    updater;

  before(async () => {
    [signer] = provider.getWallets();
    updater = await optics.Updater.fromSigner(signer, governorDomain);
  });

  beforeEach(async () => {
    // Deploy XAppConnectionManager
    connectionManager = await optics.deployImplementation(
      'TestXAppConnectionManager',
      [],
    );

    // Deploy home's mock updater manager
    const mockUpdaterManager = await deployMockContract(
      signer,
      UpdaterManager.abi,
    );
    await mockUpdaterManager.mock.updater.returns(signer.address);
    await mockUpdaterManager.mock.slashUpdater.returns();

    // Deploy home
    const {
      contracts: homeContracts,
    } = await optics.deployUpgradeSetupAndProxy(
      'TestHome',
      [],
      [nonGovernorDomain, mockUpdaterManager.address],
    );
    home = homeContracts.proxyWithImplementation;

    // Set XAppConnectionManager's home
    await connectionManager.setHome(home.address);

    // Deploy single replica that draws from `governorDomain`
    const {
      contracts: enrolledReplicaContracts,
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
    enrolledReplica = enrolledReplicaContracts.proxyWithImplementation;

    // Enroll replica for `governorDomain`
    await connectionManager.ownerEnrollReplica(
      enrolledReplica.address,
      governorDomain,
    );

    // Deploy nonGovernorRouter given XAppConnectionManager
    const {
      contracts: govRouterContracts,
    } = await optics.deployUpgradeSetupAndProxy(
      'TestGovernanceRouter',
      [nonGovernorDomain],
      [connectionManager.address],
      controller,
      'initialize(address)',
    );
    nonGovernorRouter = govRouterContracts.proxyWithImplementation;

    // Set nonGovernorRouter's governorDomain and governorRouter to
    // `governorDomain` and `governorRouter`.address
    await nonGovernorRouter.setRouter(
      governorDomain,
      optics.ethersAddressToBytes32(governorRouter.address),
    );
  });

  it('Rejects message from unenrolled replica', async () => {
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

    const newDomain = 3000;
    const transferGovernorMsg = optics.GovernanceRouter.formatTransferGovernor(
      newDomain,
      optics.ethersAddressToBytes32(newGovernor.address),
    );

    // Some sender on governor domain tries to send transferGovernorMsg to
    // nonGovernorRouter
    const opticsMessage = optics.formatMessage(
      governorDomain,
      governorRouter.address,
      1,
      nonGovernorDomain,
      nonGovernorRouter.address,
      transferGovernorMsg,
    );

    // Set message status to MessageStatus.Pending
    await unenrolledReplica.setMessagePending(opticsMessage);

    let [success, ret] = await unenrolledReplica.callStatic.testProcess(
      opticsMessage,
    );
    expect(success).to.be.false;
    expect(ret).to.equal('!replica');
  });

  it('Rejects message not from governor router', async () => {
    const [sender, newGovernor] = provider.getWallets();

    const newDomain = 3000;
    const transferGovernorMsg = optics.GovernanceRouter.formatTransferGovernor(
      newDomain,
      optics.ethersAddressToBytes32(newGovernor.address),
    );

    // Some sender on domain 3000 tries to send transferGovernorMsg to
    // nonGovernorRouter (should fail because sender domain not governorRouter
    // domain and sender not governorRouter address)
    const senderDomain = 3000;
    const opticsMessage = optics.formatMessage(
      senderDomain,
      sender.address,
      1,
      nonGovernorDomain,
      nonGovernorRouter.address,
      transferGovernorMsg,
    );

    // Set message status to MessageStatus.Pending
    await enrolledReplica.setMessagePending(opticsMessage);

    let [success, ret] = await enrolledReplica.callStatic.testProcess(
      opticsMessage,
    );
    expect(success).to.be.false;
    expect(ret).to.equal('!governorRouter');
  });

  // TODO: nonGovernorRouter governorDomain being set to localDomain (incorrect behavior await fix)
  it('Accepts a valid transfer governor message', async () => {
    // const [newGovernor] = provider.getWallets();
    // const newDomain = 3000;
    // const transferGovernorMsg = optics.GovernanceRouter.formatTransferGovernor(
    //   newDomain,
    //   optics.ethersAddressToBytes32(newGovernor.address),
    // );
    // // Message sent from governorDomain and by governorRouter
    // const opticsMessage = optics.formatMessage(
    //   governorDomain,
    //   governorRouter.address,
    //   1,
    //   nonGovernorDomain,
    //   nonGovernorRouter.address,
    //   transferGovernorMsg,
    // );
    // // Set message status to MessageStatus.Pending
    // await enrolledReplica.setMessagePending(opticsMessage);
    // let [success, ret] = await enrolledReplica.callStatic.testProcess(
    //   opticsMessage,
    // );
    // console.log(ret);
    // expect(success).to.be.true;
  });
});

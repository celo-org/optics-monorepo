const { waffle, ethers } = require('hardhat');
const { provider, deployMockContract } = waffle;
const { expect } = require('chai');
const UpdaterManager = require('../artifacts/contracts/UpdaterManager.sol/UpdaterManager.json');

const localDomain = 1000;
const remoteDomain = 2000;
const optimisticSeconds = 3;
const initialCurrentRoot = ethers.utils.formatBytes32String('current');
const initialLastProcessed = 0;
const controller = null;

describe('GovernanceRouter', async () => {
  let governanceRouter,
    connectionManager,
    enrolledReplica,
    unenrolledReplica,
    signer,
    updater;

  before(async () => {
    [signer] = provider.getWallets();
    updater = await optics.Updater.fromSigner(signer, remoteDomain);
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
      [localDomain, mockUpdaterManager.address],
    );
    home = homeContracts.proxyWithImplementation;

    // Set XAppConnectionManager's home
    await connectionManager.setHome(home.address);

    // Deploy single replica to enroll
    const {
      contracts: enrolledReplicaContracts,
    } = await optics.deployUpgradeSetupAndProxy(
      'TestReplica',
      [localDomain],
      [
        localDomain,
        updater.signer.address,
        initialCurrentRoot,
        optimisticSeconds,
        initialLastProcessed,
      ],
      controller,
      'initialize(uint32, address, bytes32, uint256, uint256)',
    );
    enrolledReplica = enrolledReplicaContracts.proxyWithImplementation;

    // Enroll replica
    await connectionManager.ownerEnrollReplica(
      enrolledReplica.address,
      localDomain,
    );

    // Deploy governance router given XAppConnectionManager
    const {
      contracts: govRouterContracts,
    } = await optics.deployUpgradeSetupAndProxy(
      'TestGovernanceRouter',
      [localDomain],
      [connectionManager.address],
      controller,
      'initialize(address)',
    );
    governanceRouter = govRouterContracts.proxyWithImplementation;
  });

  it('Rejects message from unenrolled replica', async () => {
    const [sender, newGovernor] = provider.getWallets();

    // Deploy single replica that will not be enrolled
    const {
      contracts: unenrolledReplicaContracts,
    } = await optics.deployUpgradeSetupAndProxy(
      'TestReplica',
      [localDomain],
      [
        localDomain,
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

    // Some sender on domain 3000 tries to send transferGovernorMsg to
    // GovernanceRouter on domain 1000
    const senderDomain = 3000;
    const formattedMessage = optics.formatMessage(
      senderDomain,
      sender.address,
      1,
      localDomain,
      governanceRouter.address,
      transferGovernorMsg,
    );

    // Set message status to MessageStatus.Pending
    await unenrolledReplica.setMessagePending(formattedMessage);

    let [success, ret] = await unenrolledReplica.callStatic.testProcess(
      formattedMessage,
    );
    expect(success).to.be.false;
    expect(ret).to.equal('!replica');
  });
});

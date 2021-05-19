const { waffle, ethers } = require('hardhat');
const { provider, deployMockContract } = waffle;
const { expect } = require('chai');
const UpdaterManager = require('../artifacts/contracts/UpdaterManager.sol/UpdaterManager.json');

const {
  testCases: signedFailureTestCases,
} = require('../../../vectors/signedFailureTestCases.json');
const testUtils = require('./utils');

const ONLY_OWNER_REVERT_MSG = 'Ownable: caller is not the owner';
const localDomain = 1000;
const remoteDomain = 2000;
const optimisticSeconds = 3;
const initialCurrentRoot = ethers.utils.formatBytes32String('current');
const initialLastProcessed = 0;
const controller = null;
const walletProvider = new testUtils.WalletProvider(provider);

describe('XAppConnectionManager', async () => {
  let connectionManager,
    mockUpdaterManager,
    enrolledReplica,
    home,
    signer,
    updater;

  before(async () => {
    [signer] = walletProvider.getWalletsPersistent(1);
    updater = await optics.Updater.fromSigner(signer, remoteDomain);
  });

  beforeEach(async () => {
    // Deploy XAppConnectionManager
    connectionManager = await optics.deployImplementation(
      'TestXAppConnectionManager',
      [],
    );

    // Deploy home's mock updater manager
    mockUpdaterManager = await deployMockContract(signer, UpdaterManager.abi);
    await mockUpdaterManager.mock.updater.returns(signer.address);
    await mockUpdaterManager.mock.slashUpdater.returns();

    // Deploy home
    const {
      contracts: homeContracts,
    } = await optics.deployUpgradeSetupAndProxy(
      'TestHome',
      [localDomain],
      [mockUpdaterManager.address],
    );
    home = homeContracts.proxyWithImplementation;

    // Set XAppConnectionManager's home
    await connectionManager.setHome(home.address);

    // Deploy single replica
    const { contracts } = await optics.deployUpgradeSetupAndProxy(
      'TestReplica',
      [localDomain],
      [
        remoteDomain,
        updater.signer.address,
        initialCurrentRoot,
        optimisticSeconds,
        initialLastProcessed,
      ],
      controller,
      'initialize(uint32, address, bytes32, uint256, uint256)',
    );
    enrolledReplica = contracts.proxyWithImplementation;

    // Enroll replica and check that enrolling replica succeeded
    await connectionManager.ownerEnrollReplica(
      enrolledReplica.address,
      remoteDomain,
    );
  });

  it('Returns the local domain', async () => {
    expect(await connectionManager.localDomain()).to.equal(localDomain);
  });

  it('onlyOwner function rejects call from non-owner', async () => {
    const [nonOwner, nonHome] = walletProvider.getWalletsEphemeral(2);
    await expect(
      connectionManager.connect(nonOwner).setHome(nonHome.address),
    ).to.be.revertedWith(ONLY_OWNER_REVERT_MSG);
  });

  it('isOwner returns true for owner and false for non-owner', async () => {
    const [newOwner, nonOwner] = walletProvider.getWalletsEphemeral(2);
    await connectionManager.transferOwnership(newOwner.address);
    expect(await connectionManager.isOwner(newOwner.address)).to.be.true;
    expect(await connectionManager.isOwner(nonOwner.address)).to.be.false;
  });

  it('isReplica returns true for enrolledReplica and false for non-enrolled Replica', async () => {
    const [nonEnrolledReplica] = walletProvider.getWalletsEphemeral(1);
    expect(await connectionManager.isReplica(enrolledReplica.address)).to.be
      .true;
    expect(await connectionManager.isReplica(nonEnrolledReplica.address)).to.be
      .false;
  });

  it('Allows owner to set the home', async () => {
    const {
      contracts: newHomeContracts,
    } = await optics.deployUpgradeSetupAndProxy(
      'TestHome',
      [localDomain],
      [mockUpdaterManager.address],
    );
    const newHome = newHomeContracts.proxyWithImplementation;

    await connectionManager.setHome(newHome.address);
    expect(await connectionManager.home()).to.equal(newHome.address);
  });

  it('Owner can enroll a new replica', async () => {
    const newRemoteDomain = 3000;
    const {
      contracts: newReplicaContracts,
    } = await optics.deployUpgradeSetupAndProxy(
      'TestReplica',
      [localDomain],
      [
        newRemoteDomain,
        updater.signer.address,
        initialCurrentRoot,
        optimisticSeconds,
        initialLastProcessed,
      ],
      controller,
      'initialize(uint32, address, bytes32, uint256, uint256)',
    );
    const newReplica = newReplicaContracts.proxyWithImplementation;

    // Assert new replica not considered replica before enrolled
    expect(await connectionManager.isReplica(newReplica.address)).to.be.false;

    await expect(
      connectionManager.ownerEnrollReplica(newReplica.address, newRemoteDomain),
    ).to.emit(connectionManager, 'ReplicaEnrolled');

    expect(await connectionManager.domainToReplica(newRemoteDomain)).to.equal(
      newReplica.address,
    );
    expect(
      await connectionManager.replicaToDomain(newReplica.address),
    ).to.equal(newRemoteDomain);
    expect(await connectionManager.isReplica(newReplica.address)).to.be.true;
  });

  it('Owner can unenroll a replica', async () => {
    await expect(
      connectionManager.ownerUnenrollReplica(enrolledReplica.address),
    ).to.emit(connectionManager, 'ReplicaUnenrolled');

    expect(
      await connectionManager.replicaToDomain(enrolledReplica.address),
    ).to.equal(0);
    expect(await connectionManager.domainToReplica(localDomain)).to.equal(
      ethers.constants.AddressZero,
    );
    expect(await connectionManager.isReplica(enrolledReplica.address)).to.be
      .false;
  });

  it('Owner can set watcher permissions', async () => {
    const [watcher] = walletProvider.getWalletsEphemeral(1);
    expect(
      await connectionManager.watcherPermission(watcher.address, remoteDomain),
    ).to.be.false;

    await expect(
      connectionManager.setWatcherPermission(
        watcher.address,
        remoteDomain,
        true,
      ),
    ).to.emit(connectionManager, 'WatcherPermissionSet');

    expect(
      await connectionManager.watcherPermission(watcher.address, remoteDomain),
    ).to.be.true;
  });

  it('Unenrolls a replica given valid SignedFailureNotification', async () => {
    // Set watcher permissions for domain of currently enrolled replica
    const [watcher] = walletProvider.getWalletsEphemeral(1);
    await connectionManager.setWatcherPermission(
      watcher.address,
      remoteDomain,
      true,
    );

    // Create signed failure notification and signature
    const {
      failureNotification,
      signature,
    } = await optics.signedFailureNotification(
      watcher,
      remoteDomain,
      updater.signer.address,
    );

    // Assert new replica considered replica before unenrolled
    expect(await connectionManager.isReplica(enrolledReplica.address)).to.be
      .true;

    // Unenroll replica using data + signature
    await expect(
      connectionManager.unenrollReplica(
        failureNotification.domain,
        failureNotification.updaterBytes32,
        signature,
      ),
    ).to.emit(connectionManager, 'ReplicaUnenrolled');

    expect(
      await connectionManager.replicaToDomain(enrolledReplica.address),
    ).to.equal(0);
    expect(await connectionManager.domainToReplica(localDomain)).to.equal(
      ethers.constants.AddressZero,
    );
    expect(await connectionManager.isReplica(enrolledReplica.address)).to.be
      .false;
  });

  it('unenrollReplica reverts if there is no replica for provided domain', async () => {
    const noReplicaDomain = 3000;

    // Set watcher permissions for noReplicaDomain
    const [watcher] = walletProvider.getWalletsEphemeral(1);
    await connectionManager.setWatcherPermission(
      watcher.address,
      noReplicaDomain,
      true,
    );

    // Create signed failure notification and signature for noReplicaDomain
    const {
      failureNotification,
      signature,
    } = await optics.signedFailureNotification(
      watcher,
      noReplicaDomain,
      updater.signer.address,
    );

    // Expect unenrollReplica call to revert
    await expect(
      connectionManager.unenrollReplica(
        failureNotification.domain,
        failureNotification.updaterBytes32,
        signature,
      ),
    ).to.be.revertedWith('!replica exists');
  });

  it('unenrollReplica reverts if provided updater does not match replica updater', async () => {
    const [watcher, nonUpdater] = walletProvider.getWalletsEphemeral(2);

    // Set watcher permissions
    await connectionManager.setWatcherPermission(
      watcher.address,
      remoteDomain,
      true,
    );

    // Create signed failure notification and signature with nonUpdater
    const {
      failureNotification,
      signature,
    } = await optics.signedFailureNotification(
      watcher,
      remoteDomain,
      nonUpdater.address,
    );

    // Expect unenrollReplica call to revert
    await expect(
      connectionManager.unenrollReplica(
        failureNotification.domain,
        failureNotification.updaterBytes32,
        signature,
      ),
    ).to.be.revertedWith('!current updater');
  });

  it('unenrollReplica reverts if incorrect watcher provided', async () => {
    const [watcher, nonWatcher] = walletProvider.getWalletsEphemeral(2);

    // Set watcher permissions
    await connectionManager.setWatcherPermission(
      watcher.address,
      remoteDomain,
      true,
    );

    // Create signed failure notification and signature with nonWatcher
    const {
      failureNotification,
      signature,
    } = await optics.signedFailureNotification(
      nonWatcher,
      remoteDomain,
      updater.signer.address,
    );

    // Expect unenrollReplica call to revert
    await expect(
      connectionManager.unenrollReplica(
        failureNotification.domain,
        failureNotification.updaterBytes32,
        signature,
      ),
    ).to.be.revertedWith('!valid watcher');
  });

  it('Checks Rust-produced SignedFailureNotification', async () => {
    // Compare Rust output in json file to solidity output
    const testCase = signedFailureTestCases[0];
    const { domain, updater, signature, signer } = testCase;

    await enrolledReplica.setUpdater(updater);
    await connectionManager.setWatcherPermission(signer, domain, true);

    // Just performs signature recovery (not dependent on replica state, just
    // tests functionality)
    const watcher = await connectionManager.testRecoverWatcherFromSig(
      domain,
      enrolledReplica.address,
      updater,
      ethers.utils.joinSignature(signature),
    );

    expect(watcher.toLowerCase()).to.equal(signer);
  });
});

const { waffle, ethers } = require('hardhat');
const { provider, deployMockContract } = waffle;
const { expect } = require('chai');
const UpdaterManager = require('../artifacts/contracts/UpdaterManager.sol/UpdaterManager.json');

const localDomain = 1000;
const remoteDomain = 2000;
const optimisticSeconds = 3;
const initialCurrentRoot = ethers.utils.formatBytes32String('current');
const initialLastProcessed = 0;

describe('GovernanceRouter', async () => {
  let governanceRouter, connectionManager, replica, signer, updater;

  before(async () => {
    [signer] = provider.getWallets();
    updater = await optics.Updater.fromSigner(signer, remoteDomain);
  });

  beforeEach(async () => {
    const controller = null;

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
    replica = contracts.proxyWithImplementation;

    // Enroll replica
    await connectionManager.ownerEnrollReplica(replica.address, localDomain);

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

  it('Receives message from enrolled replica', async () => {});
});

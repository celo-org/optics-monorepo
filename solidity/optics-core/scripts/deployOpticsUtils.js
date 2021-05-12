/*
 * Deploy the contracts for an upgradable TestGovernanceRouter contract (Implementation + UpgradeBeacon + Proxy)
 * on the given domain
 *
 * @param localDomain - domain on which the Home contract will be deployed
 * @param controller - ethers Contract of the UpgradeBeaconController contract
 * @param XAappConnectionManagerAddress - address of the XAappConnectionManager contract for the TestGovernanceRouter
 * @param isTestDeploy - boolean, true to deploy the test contract, false otherwise
 *
 * @return contracts - UpgradableContractSetup type for the GovernanceRouter contracts
 */
async function devDeployGovernanceRouter(
  localDomain,
  controller,
  xAppConnectionManagerAddress,
  isTestDeploy,
) {
  const contractStr = isTestDeploy
    ? 'TestGovernanceRouter'
    : 'GovernanceRouter';
  const { contracts } = await optics.deployUpgradeSetupAndProxy(
    contractStr,
    [localDomain],
    [xAppConnectionManagerAddress],
    controller,
  );

  return contracts;
}

/*
 * Deploy the XAppConnectionManager contract
 *
 * @return xAppConnectionManager - ethers Contract for the XAppConnectionManager contract
 */
async function deployXAppConnectionManager() {
  return optics.deployImplementation('XAppConnectionManager');
}

/*
 * Deploy the UpdaterManager contract
 * with the given initial updater
 *
 * @param updater - address of the Updater for this chain
 *
 * @return updaterManager - ethers Contract for the UpdaterManager contract
 */
async function deployUpdaterManager(updater) {
  return await optics.deployImplementation('UpdaterManager', [updater]);
}

/*
 * Deploy the contracts for an upgradable Home contract (Implementation + UpgradeBeacon + Proxy)
 * on the given domain
 *
 * @param localDomain - domain on which the Home contract will be deployed
 * @param controller - ethers Contract of the UpgradeBeaconController contract
 * @param updaterManager - address of the UpdaterManager contract
 * @param isTestDeploy - boolean, true to deploy the test contract, false otherwise
 *
 * @return contracts - UpgradableContractSetup type for the Home contracts
 */
async function devDeployHome(
  localDomain,
  controller,
  updaterManagerAddress,
  isTestDeploy,
) {
  const contractStr = isTestDeploy ? 'TestHome' : 'Home';
  const { contracts } = await optics.deployUpgradeSetupAndProxy(
    contractStr,
    [localDomain],
    [updaterManagerAddress],
    controller,
  );

  return contracts;
}

/*
 * Deploy the TestReplica Implementation and UpgradeBeacon
 * which will be used to spawn ReplicaProxies for each remote chain
 *
 * @param localDomain - domain that the TestReplica setup will be deployed on
 * @param controller - ethers Contract for the UpgradeBeaconController
 * @param isTestDeploy - boolean, true to deploy the test contract, false otherwise
 *
 * @return contracts - UpgradeSetup type
 */
async function devDeployReplicaUpgradeSetup(
  localDomain,
  controller,
  isTestDeploy,
) {
  const contractStr = isTestDeploy ? 'TestReplica' : 'Replica';

  const contracts = await optics.deployUpgradeSetup(
    contractStr,
    [localDomain],
    controller,
  );

  return contracts;
}

/*
 * Deploy the Replica Proxy which points to the given UpgradeBeacon
 * and "listens" to the given remote chain
 *
 * @param upgradeBeaconAddress - address of the Replica Upgrade Beacon contract
 * @param remote - ChainConfig for the remote chain that the Replica will receive updates from
 * @param isTestDeploy - boolean, true to deploy the test contract, false otherwise
 *
 * @return contracts - UpgradableProxy type
 */
async function devDeployReplicaProxy(
  upgradeBeaconAddress,
  remote,
  isTestDeploy,
) {
  const contractStr = isTestDeploy ? 'TestReplica' : 'Replica';

  // Construct initialize args
  const {
    domain,
    updater,
    currentRoot,
    lastProcessedIndex,
    optimisticSeconds,
  } = remote;
  const proxyInitializeArgs = [
    domain,
    updater,
    currentRoot,
    optimisticSeconds,
    lastProcessedIndex,
  ];

  // Deploy Proxy Contract and initialize
  const {
    proxy,
    proxyWithImplementation,
  } = await optics.deployProxyWithImplementation(
    upgradeBeaconAddress,
    contractStr,
    proxyInitializeArgs,
    'initialize(uint32, address, bytes32, uint256, uint256)',
  );

  const contracts = {
    proxy,
    proxyWithImplementation,
  };

  return contracts;
}

/*
 * Deploy, initialize, and configure the entire
 * suite of Optics contracts for a single chain
 * specified by the config information
 *
 * @param local - a single ChainConfig for the local chain
 * @param remotes - an array of ChainConfigs for each of the remote chains
 * @param isTestDeploy - boolean, true to deploy the test contracts, false otherwise
 *
 * @return contracts - OpticsContracts type for the suite of Optics contract on this chain
 */
async function devDeployOptics(local, remotes, isTestDeploy) {
  const { domain, updater: localUpdaterAddress } = local;

  // Deploy UpgradeBeaconController
  // Note: initial owner will be the signer that's deploying
  const upgradeBeaconController = await optics.deployUpgradeBeaconController();

  const updaterManager = await deployUpdaterManager(localUpdaterAddress);

  // Deploy XAppConnectionManager
  // Note: initial owner will be the signer that's deploying
  const xAppConnectionManager = await deployXAppConnectionManager();

  // Deploy Home and setHome on XAppConnectionManager
  const home = await devDeployHome(
    domain,
    upgradeBeaconController,
    updaterManager.address,
    isTestDeploy,
  );

  await xAppConnectionManager.setHome(home.proxy.address);
  await updaterManager.setHome(home.proxy.address);

  // Deploy GovernanceRouter
  // Note: initial governor will be the signer that's deploying
  const governanceRouter = await devDeployGovernanceRouter(
    domain,
    upgradeBeaconController,
    xAppConnectionManager.address,
    isTestDeploy,
  );

  // Deploy Replica Upgrade Setup
  const replicaSetup = await devDeployReplicaUpgradeSetup(
    domain,
    upgradeBeaconController,
    isTestDeploy,
  );

  // Deploy Replica Proxies and enroll in XAppConnectionManager
  const replicaProxies = {};
  for (let remote of remotes) {
    const { domain: remoteDomain, watchers } = remote;

    const replica = await devDeployReplicaProxy(
      replicaSetup.upgradeBeacon.address,
      remote,
      isTestDeploy,
    );

    replicaProxies[remoteDomain] = replica;

    // Enroll Replica Proxy on XAppConnectionManager
    await xAppConnectionManager.ownerEnrollReplica(
      replica.proxy.address,
      remoteDomain,
    );

    // Add watcher permissions for Replica
    for (let watcher in watchers) {
      await xAppConnectionManager.setWatcherPermission(
        watcher,
        remoteDomain,
        true,
      );
    }
  }

  // Delegate permissions to governance router
  await updaterManager.transferOwnership(governanceRouter.proxy.address);
  await xAppConnectionManager.transferOwnership(governanceRouter.proxy.address);
  await upgradeBeaconController.transferOwnership(
    governanceRouter.proxy.address,
  );
  await home.proxyWithImplementation.transferOwnership(
    governanceRouter.proxy.address,
  );

  const contracts = {
    upgradeBeaconController,
    xAppConnectionManager,
    governanceRouter,
    updaterManager,
    home,
    replicaSetup,
    replicaProxies,
  };

  return contracts;
}

module.exports = {
  devDeployGovernanceRouter,
  devDeployReplicaUpgradeSetup,
  devDeployReplicaProxy,
  devDeployHome,
  devDeployOptics,
};

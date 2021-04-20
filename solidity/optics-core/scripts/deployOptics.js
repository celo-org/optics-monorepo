/*
 * Deploy the Replica Implementation and UpgradeBeacon
 * which will be used to spawn ReplicaProxies for each remote chain
 *
 * @param localDomain - domain that the Replica setup will be deployed on
 * @param controller - ethers Contract for the UpgradeBeaconController
 *
 * @return contracts - UpgradeSetup type
 */
async function deployReplicaUpgradeSetup(localDomain, controller) {
  const contracts = await optics.deployUpgradeSetup(
    'Replica',
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
 *
 * @return contracts - UpgradableProxy type
 */
async function deployReplicaProxy(upgradeBeaconAddress, remote) {
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
    'Replica',
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
 *
 * @return contracts - UpgradableContractSetup type for the Home contracts
 */
async function deployHome(localDomain, controller, updaterManagerAddress) {
  const { contracts } = await optics.deployUpgradeSetupAndProxy(
    'Home',
    [localDomain],
    [updaterManagerAddress],
    controller,
  );

  return contracts;
}

/*
 * Deploy the contracts for an upgradable GovernanceRouter contract (Implementation + UpgradeBeacon + Proxy)
 * on the given domain
 *
 * @param localDomain - domain on which the Home contract will be deployed
 * @param controller - ethers Contract of the UpgradeBeaconController contract
 * @param XAappConnectionManagerAddress - address of the XAappConnectionManager contract for the GovernanceRouter
 *
 * @return contracts - UpgradableContractSetup type for the GovernanceRouter contracts
 */
async function deployGovernanceRouter(
  localDomain,
  controller,
  xAppConnectionManagerAddress,
) {
  const { contracts } = await optics.deployUpgradeSetupAndProxy(
    'GovernanceRouter',
    [localDomain],
    [xAppConnectionManagerAddress],
    controller,
  );

  return contracts;
}

// TODO: #later explore bundling these deploys into a single transaction to a bespoke DeployHelper contract
/*
 * Deploy, initialize, and configure the entire
 * suite of Optics contracts for a single chain
 * specified by the config information
 *
 * @param local - a single ChainConfig for the local chain
 * @param remotes - an array of ChainConfigs for each of the remote chains
 *
 * @return contracts - OpticsContracts type for the suite of Optics contract on this chain
 */
async function deployOptics(local, remotes) {
  const { domain, updater: localUpdaterAddress } = local;

  // Deploy UpgradeBeaconController
  // Note: initial owner will be the signer that's deploying
  const upgradeBeaconController = await optics.deployUpgradeBeaconController();

  const updaterManager = await deployUpdaterManager(localUpdaterAddress);

  // Deploy XAppConnectionManager
  // Note: initial owner will be the signer that's deploying
  const xAppConnectionManager = await deployXAppConnectionManager();

  // Deploy Home and setHome on XAppConnectionManager
  const home = await deployHome(
    domain,
    upgradeBeaconController,
    updaterManager.address,
  );

  await xAppConnectionManager.setHome(home.proxy.address);
  await updaterManager.setHome(home.proxy.address);

  // Deploy GovernanceRouter
  // Note: initial governor will be the signer that's deploying
  const governanceRouter = await deployGovernanceRouter(
    domain,
    upgradeBeaconController,
    xAppConnectionManager.address,
  );

  // Deploy Replica Upgrade Setup
  const replicaSetup = await deployReplicaUpgradeSetup(
    domain,
    upgradeBeaconController,
  );

  // Deploy Replica Proxies and enroll in XAppConnectionManager
  const replicaProxies = {};
  for (let remote of remotes) {
    const { domain: remoteDomain, watchers } = remote;

    const replica = await deployReplicaProxy(
      replicaSetup.upgradeBeacon.address,
      remote,
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
  deployOptics,
};

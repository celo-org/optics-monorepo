async function deployReplicaUpgradeSetup(originDomain, controller) {
  const contracts = await optics.deployUpgradeSetup(
    'Replica',
    [originDomain],
    controller,
  );

  return contracts;
}

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

  return {
    proxy,
    proxyWithImplementation,
  };
}

async function deployXAppConnectionManager() {
  return optics.deployImplementation('XAppConnectionManager');
}

async function deployUpdaterManager(updater) {
  return await optics.deployImplementation('UpdaterManager', [updater]);
}

async function deployHome(originDomain, updaterManager, controller) {
  const { contracts } = await optics.deployUpgradeSetupAndProxy(
    'Home',
    [originDomain],
    [updaterManager.address],
    controller,
  );

  return contracts;
}

async function deployGovernanceRouter(
  originDomain,
  controller,
  xAppConnectionManagerAddress,
) {
  const { contracts } = await optics.deployUpgradeSetupAndProxy(
    'GovernanceRouter',
    [originDomain],
    [xAppConnectionManagerAddress],
    controller,
  );

  return contracts;
}

/*
 * struct ChainConfig {
 *   domain: uint32,
 *   updater: address,
 *   currentRoot: bytes32,
 *   lastProcessedIndex: uint256,
 *   optimisticSeconds: uint256,
 *   watchers?: [address],
 *   // chainURL
 * };
 * * param origin should be a ChainConfig
 * * param remotes should be an array of ChainConfigs
 * */
// TODO: #later explore bundling these deploys into a single transaction to a bespoke DeployHelper contract
async function deployOptics(origin, remotes) {
  const { domain: originDomain, updater: originUpdaterAddress } = origin;

  // Deploy UpgradeBeaconController
  // Note: initial owner will be the signer that's deploying
  const upgradeBeaconController = await optics.deployUpgradeBeaconController();

  const updaterManager = await deployUpdaterManager(originUpdaterAddress);

  // Deploy XAppConnectionManager
  // Note: initial owner will be the signer that's deploying
  const xAppConnectionManager = await deployXAppConnectionManager();

  // Deploy Home and setHome on XAppConnectionManager
  const home = await deployHome(
    originDomain,
    originUpdaterAddress,
    upgradeBeaconController,
  );

  await xAppConnectionManager.setHome(home.proxy.address);
  await updaterManager.setHome(home.proxy.address);

  // Deploy GovernanceRouter
  // Note: initial governor will be the signer that's deploying
  const governanceRouter = await deployGovernanceRouter(
    originDomain,
    upgradeBeaconController,
    xAppConnectionManager.address,
  );

  // Deploy Replica Upgrade Setup
  const replicaSetup = await deployReplicaUpgradeSetup(
    originDomain,
    upgradeBeaconController,
  );

  // Deploy Replica Proxies and enroll in XAppConnectionManager
  const replicaProxies = [];
  for (let remote of remotes) {
    const { domain, watchers } = remote;

    const replica = await deployReplicaProxy(
      replicaSetup.upgradeBeacon.address,
      remote,
    );

    replicaProxies.push({
      ...remote,
      ...replica,
    });

    // Enroll Replica Proxy on XAppConnectionManager
    await xAppConnectionManager.enrollReplica(domain, replica.proxy.address);

    // Add watcher permissions for Replica
    for (let watcher in watchers) {
      await xAppConnectionManager.setWatcherPermission(watcher, domain, true);
    }
  }

  // Delegate permissions to governance router
  await updaterManager.transferOwnership(governanceRouter.proxy.address);
  await xAppConnectionManager.transferOwnership(governanceRouter.proxy.address);
  await upgradeBeaconController.transferOwnership(
    governanceRouter.proxy.address,
  );

  return {
    upgradeBeaconController,
    xAppConnectionManager,
    governanceRouter,
    updaterManager,
    home,
    replicaSetup,
    replicaProxies,
  };
}

module.exports = {
  deployOptics,
};

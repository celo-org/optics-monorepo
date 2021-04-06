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

async function deployXappConnectionManager() {
  return optics.deployImplementation('XappConnectionManager');
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
  xappConnectionManagerAddress,
) {
  const { contracts } = await optics.deployUpgradeSetupAndProxy(
    'GovernanceRouter',
    [originDomain],
    [xappConnectionManagerAddress],
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

  // Deploy XappConnectionManager
  // Note: initial owner will be the signer that's deploying
  const xappConnectionManager = await deployXappConnectionManager();

  // Deploy Home and setHome on XappConnectionManager
  const home = await deployHome(
    originDomain,
    originUpdaterAddress,
    upgradeBeaconController,
  );

  await xappConnectionManager.setHome(home.proxy.address);
  await updaterManager.setHome(home.proxy.address);

  // Deploy GovernanceRouter
  // Note: initial governor will be the signer that's deploying
  const governanceRouter = await deployGovernanceRouter(
    originDomain,
    upgradeBeaconController,
    xappConnectionManager.address,
  );

  // Deploy Replica Upgrade Setup
  const replicaSetup = await deployReplicaUpgradeSetup(
    originDomain,
    upgradeBeaconController,
  );

  // Deploy Replica Proxies and enroll in XappConnectionManager
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

    // Enroll Replica Proxy on XappConnectionManager
    await xappConnectionManager.enrollReplica(domain, replica.proxy.address);

    // Add watcher permissions for Replica
    for (let watcher in watchers) {
      await xappConnectionManager.setWatcherPermission(watcher, domain, true);
    }
  }

  // Delegate permissions to governance router
  await updaterManager.transferOwnership(governanceRouter.proxy.address);
  await xappConnectionManager.transferOwnership(governanceRouter.proxy.address);
  await upgradeBeaconController.transferOwnership(
    governanceRouter.proxy.address,
  );

  return {
    upgradeBeaconController,
    xappConnectionManager,
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

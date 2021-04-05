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

async function deployUsingOptics() {
  return optics.deployImplementation('UsingOptics');
}

async function deployUpdaterManger(updaterAddress) {
  // TODO: deploy updated UpdaterManager (after Erin updates these contracts)
  return await optics.deployImplementation('TestSortition', [updaterAddress]);
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
  usingOpticsAddress,
) {
  const { contracts } = await optics.deployUpgradeSetupAndProxy(
    'GovernanceRouter',
    [originDomain],
    [usingOpticsAddress],
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
// TODO: #later explore bunding these deploys into a single transaction to a bespoke DeployHelper contract
async function deployOptics(origin, remotes) {
  const { domain: originDomain, updater: originUpdaterAddress } = origin;

  // Deploy UpgradeBeaconController
  // Note: initial owner will be the signer that's deploying
  const upgradeBeaconController = await optics.deployUpgradeBeaconController();

  const updaterManager = await deployUpdaterManger(originUpdaterAddress);

  // Deploy UsingOptics
  // Note: initial owner will be the signer that's deploying
  const usingOptics = await deployUsingOptics();

  // Deploy Home and setHome on UsingOptics
  const home = await deployHome(
    originDomain,
    updaterManager,
    upgradeBeaconController,
  );

  await usingOptics.setHome(home.proxy.address);
  await updaterManager.setHome(home.proxy.address);

  // Deploy GovernanceRouter
  // Note: initial governor will be the signer that's deploying
  const governanceRouter = await deployGovernanceRouter(
    originDomain,
    upgradeBeaconController,
    usingOptics.address,
  );

  // Deploy Replica Upgrade Setup
  const replicaSetup = await deployReplicaUpgradeSetup(
    originDomain,
    upgradeBeaconController,
  );

  // Deploy Replica Proxies and enroll in UsingOptics
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

    // Enroll Replica Proxy on UsingOptics
    await usingOptics.enrollReplica(domain, replica.proxy.address);

    // Add watcher permissions for Replica
    for (let watcher in watchers) {
      await usingOptics.setWatcherPermission(watcher, domain, true);
    }
  }

  // Delegate permissions to governance router
  await updaterManager.transferOwnership(governanceRouter.proxy.address);
  await usingOptics.transferOwnership(governanceRouter.proxy.address);
  await upgradeBeaconController.transferOwnership(
    governanceRouter.proxy.address,
  );

  return {
    upgradeBeaconController,
    usingOptics,
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

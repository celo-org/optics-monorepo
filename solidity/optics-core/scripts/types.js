/*
 * ChainConfig {
 *      domain: int,
 *      updater: address,
 *      currentRoot: bytes32,
 *      lastProcessedIndex: int,
 *      optimisticSeconds: int,
 *      watchers?: [address],
 * };
 *
 * OpticsContracts {
 *      home: UpgradableContractSetup,
 *      governanceRouter: UpgradableContractSetup,
 *      replicaSetup: UpgradeSetup,
 *      replicaProxies: UpgradableProxy[],
 *      upgradeBeaconController: ethers Contract,
 *      usingOptics: ethers Contract,
 *      updaterManager: ethers Contract,
 * };
 *
 * UpgradeSetup {
 *      implementation: ethers Contract,
 *      upgradeBeaconController: ethers Contract,
 *      upgradeBeacon: ethers Contract,
 * };
 *
 * UpgradableProxy {
 *      proxy: ethers Contract,
 *      proxyWithImplementation: ethers Contract,
 * };
 *
 * UpgradableContractSetup {
 *      ...UpgradeSetup,
 *      ...UpgradableProxy,
 * };
 */

/*
 * ChainConfig {
 *      domain: int,
 *      updater: address,
 *      recoveryTimelock: int,
 *      recoveryManager: address,  // NOTE: this may change if we add a multisig to the deploy setup
 *      currentRoot: bytes32,
 *      nextToProcessIndex: int,
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
 *      xAppConnectionManager: ethers Contract,
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

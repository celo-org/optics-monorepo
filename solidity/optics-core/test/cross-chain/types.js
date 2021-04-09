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
 * ChainDetails {
 *   [domain]: {
 *      ...ChainConfig,
 *      updaterObject,
 *      signer: ethers Signer,
 *      contracts: OpticsContracts,
 *    },
 * };
 *
 * Message {
 *      message: string,
 *      destinationDomain: int,
 *      recipientAddress: address,
 * };
 *
 * Update {
 *      startRoot: bytes32,
 *      finalRoot: bytes32,
 *      signature: hex,
 * }
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

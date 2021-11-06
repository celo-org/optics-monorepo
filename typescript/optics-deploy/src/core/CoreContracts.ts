import * as contracts from '@optics-xyz/ts-interface/dist/optics-core';
import { BeaconProxy, ProxyAddresses } from '../proxyUtils';
import { Contracts } from '../contracts';
import { CoreContractAddresses } from '../chain';
import * as ethers from "ethers";

export class CoreContracts extends Contracts {
  upgradeBeaconController?: contracts.UpgradeBeaconController;
  xAppConnectionManager?: contracts.XAppConnectionManager;
  updaterManager?: contracts.UpdaterManager;
  governance?: BeaconProxy<contracts.GovernanceRouter>;
  home?: BeaconProxy<contracts.Home>;
  replicas: Record<number, BeaconProxy<contracts.Replica>>;

  constructor() {
    super();
    this.replicas = {};
  }

  toObject(): CoreContractAddresses {
    const replicas: Record<string, ProxyAddresses> = {};
    Object.entries(this.replicas).forEach(([k, v]) => {
      replicas[k] = v.toObject();
    });

    return {
      upgradeBeaconController: this.upgradeBeaconController!.address,
      xAppConnectionManager: this.xAppConnectionManager!.address,
      updaterManager: this.updaterManager!.address,
      governance: this.governance!.toObject(),
      home: this.home!.toObject(),
      replicas,
    };
  }

  static fromAddresses(addresses: CoreContractAddresses, provider: ethers.providers.JsonRpcProvider): CoreContracts {
    const core = new CoreContracts();
    core.upgradeBeaconController = contracts.UpgradeBeaconController__factory.connect(addresses.upgradeBeaconController, provider);
    core.xAppConnectionManager = contracts.XAppConnectionManager__factory.connect(addresses.xAppConnectionManager, provider);
    core.updaterManager = contracts.UpdaterManager__factory.connect(addresses.updaterManager, provider);

    // TODO: needs type magic for turning governance, home and replicas to BeaconProxy contracts
    const governanceRouterImplementation = contracts.GovernanceRouter__factory.connect(addresses.governance.implementation, provider);
    const governanceRouterProxy = contracts.GovernanceRouter__factory.connect(addresses.governance.proxy, provider);
    const governanceRouterUpgradeBeacon = contracts.UpgradeBeacon__factory.connect(addresses.governance.beacon, provider);
    core.governance = new BeaconProxy<contracts.GovernanceRouter>(governanceRouterImplementation, governanceRouterProxy, governanceRouterUpgradeBeacon);

    const homeImplementation = contracts.Home__factory.connect(addresses.home.implementation, provider);
    const homeProxy = contracts.Home__factory.connect(addresses.home.proxy, provider);
    const homeUpgradeBeacon = contracts.UpgradeBeacon__factory.connect(addresses.home.beacon, provider);
    core.home = new BeaconProxy<contracts.Home>(homeImplementation, homeProxy, homeUpgradeBeacon);

    for (let domain of Object.keys(addresses.replicas!)) {
      const replicaImplementation = contracts.Replica__factory.connect(addresses.replicas![domain].implementation, provider);
      const replicaProxy = contracts.Replica__factory.connect(addresses.replicas![domain].proxy, provider);
      const replicaUpgradeBeacon = contracts.UpgradeBeacon__factory.connect(addresses.replicas![domain].beacon, provider);
      core.replicas[parseInt(domain)] = new BeaconProxy<contracts.Replica>(replicaImplementation, replicaProxy, replicaUpgradeBeacon);
    }
    return core;
  }
}

import * as contracts from '@optics-xyz/ts-interface/dist/optics-core';
import { BeaconProxy, ProxyAddresses } from '../proxyUtils';
import { Contracts } from '../contracts';
import { CoreContractAddresses } from '../chain';

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
}

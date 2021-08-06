import * as xAppContracts from '../../../typechain/optics-xapps';
import { BeaconProxy } from '../proxyUtils';
import { Contracts } from '../contracts';

export class BridgeContracts extends Contracts {
  bridgeRouter?: BeaconProxy<xAppContracts.BridgeRouter>;
  bridgeToken?: BeaconProxy<xAppContracts.BridgeToken>;
  ethHelper?: xAppContracts.ETHHelper;

  constructor() {
    super();
  }

  toObject(): Object {
    return {
      bridgeRouter: this.bridgeRouter?.toObject(),
      bridgeToken: this.bridgeToken?.toObject(),
      ethHelper: this.ethHelper?.address,
    };
  }
}

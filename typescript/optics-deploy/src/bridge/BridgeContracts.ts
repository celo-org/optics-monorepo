import * as xAppContracts from '@optics-xyz/ts-interface/dist/optics-xapps';
import {BeaconProxy, ProxyAddresses} from '../proxyUtils';
import { Contracts } from '../contracts';
import * as ethers from "ethers";
import * as contracts from "@optics-xyz/ts-interface/dist/optics-core";

export type BridgeContractAddresses = {
  bridgeRouter: ProxyAddresses;
  bridgeToken: ProxyAddresses;
  ethHelper?: string;
};

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

  static fromAddresses(addresses: BridgeContractAddresses, signer: ethers.Signer): BridgeContracts {
    const b = new BridgeContracts();

    // TODO: needs type magic for turning governance, home and replicas to BeaconProxy contracts
    const routerImplementation = xAppContracts.BridgeRouter__factory.connect(addresses.bridgeRouter.implementation, signer);
    const routerProxy = xAppContracts.BridgeRouter__factory.connect(addresses.bridgeRouter.proxy, signer);
    const routerUpgradeBeacon = contracts.UpgradeBeacon__factory.connect(addresses.bridgeRouter.beacon, signer);
    b.bridgeRouter = new BeaconProxy<xAppContracts.BridgeRouter>(routerImplementation, routerProxy, routerUpgradeBeacon);

    const tokenImplementation = xAppContracts.BridgeToken__factory.connect(addresses.bridgeToken.implementation, signer);
    const tokenProxy = xAppContracts.BridgeToken__factory.connect(addresses.bridgeToken.proxy, signer);
    const tokenUpgradeBeacon = contracts.UpgradeBeacon__factory.connect(addresses.bridgeToken.beacon, signer);
    b.bridgeToken = new BeaconProxy<xAppContracts.BridgeToken>(tokenImplementation, tokenProxy, tokenUpgradeBeacon);

    if (addresses.ethHelper) {
      b.ethHelper = xAppContracts.ETHHelper__factory.connect(addresses.ethHelper, signer)
    }

    return b;
  }

}

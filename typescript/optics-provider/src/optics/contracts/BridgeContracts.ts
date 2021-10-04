import { ethers } from 'ethers';
import { xapps } from '@optics-xyz/ts-interface';
import { Contracts } from '../../contracts';

type Address = string;

interface ProxyInfo {
  proxy: Address;
}

interface BridgeInfo {
  id: number;
  bridgeRouter: Address | ProxyInfo;
  ethHelper?: Address;
}

export class BridgeContracts extends Contracts {
  domain: number;
  bridgeRouter: xapps.BridgeRouter;
  ethHelper?: xapps.ETHHelper;

  constructor(
    domain: number,
    bridgeRouter: Address,
    ethHelper?: Address,
    signer?: ethers.Signer,
  ) {
    super(domain, bridgeRouter, ethHelper, signer);
    this.domain = domain;
    this.bridgeRouter = new xapps.BridgeRouter__factory(signer).attach(
      bridgeRouter,
    );
    if (ethHelper) {
      this.ethHelper = new xapps.ETHHelper__factory(signer).attach(ethHelper);
    }
  }

  connect(providerOrSigner: ethers.providers.Provider | ethers.Signer): void {
    this.bridgeRouter = this.bridgeRouter.connect(providerOrSigner);
    if (this.ethHelper) {
      this.ethHelper = this.ethHelper.connect(providerOrSigner);
    }
  }

  static fromObject(data: BridgeInfo, signer?: ethers.Signer): BridgeContracts {
    const { id, bridgeRouter, ethHelper } = data;
    if (!id || !bridgeRouter) {
      throw new Error('missing domain or bridgeRouter address');
    }
    const router =
      typeof bridgeRouter === 'string' ? bridgeRouter : bridgeRouter.proxy;
    return new BridgeContracts(id, router, ethHelper, signer);
  }

  toObject(): BridgeInfo {
    const bridge: BridgeInfo = {
      id: this.domain,
      bridgeRouter: this.bridgeRouter.address,
    };
    if (this.ethHelper) {
      bridge.ethHelper = this.ethHelper.address;
    }
    return bridge;
  }
}

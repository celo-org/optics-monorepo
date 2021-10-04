import { ethers } from 'ethers';
import { xapps } from '@optics-xyz/ts-interface';
import { Contracts } from '../../contracts';

type Address = string;

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

  static fromObject(data: any, signer?: ethers.Signer) {
    const { id, bridgeRouter, ethHelper } = data;
    if (!id || !bridgeRouter) {
      throw new Error('missing domain or bridgeRouter address');
    }
    const router = bridgeRouter.proxy ?? bridgeRouter;
    return new BridgeContracts(id, router, ethHelper, signer);
  }

  toObject(): any {
    const obj: any = {
      bridgeRouter: this.bridgeRouter.address,
    };
    if (this.ethHelper) {
      obj.ethHelper = this.ethHelper.address;
    }
    return obj;
  }
}

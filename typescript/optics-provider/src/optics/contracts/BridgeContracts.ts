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
    br: Address,
    ethHelper?: Address,
    signer?: ethers.Signer,
  ) {
    super(domain, br, ethHelper, signer);
    this.domain = domain;
    this.bridgeRouter = new xapps.BridgeRouter__factory(signer).attach(br);
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
    if (!data.id || !data.bridgeRouter) {
      throw new Error('missing address or domain');
    }

    const id = data.id;
    const br = data.bridgeRouter.proxy ?? data.bridgeRouter;
    const eh = data.ethHelper;

    return new BridgeContracts(id, br, eh, signer);
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

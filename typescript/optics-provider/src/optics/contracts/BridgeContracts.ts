import fs from 'fs';
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
    if (!data.domain || !data.bridgeRouter) {
      throw new Error('missing address');
    }

    const domain = data.domain;
    const br = data.bridgeRouter.proxy ?? data.bridgeRouter;
    const eh = data.ethHelper;

    return new BridgeContracts(domain, br, eh);
  }

  static loadJson(filepath: string, signer?: ethers.Signer) {
    return this.fromObject(
      JSON.parse(fs.readFileSync(filepath, 'utf8')),
      signer,
    );
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

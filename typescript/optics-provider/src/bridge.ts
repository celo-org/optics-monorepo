import fs from 'fs';
import { ethers } from 'ethers';
import {
  BridgeRouter,
  BridgeRouter__factory,
  ETHHelper,
  ETHHelper__factory,
} from '../../typechain/optics-xapps';
import { Contracts } from './contracts';

type Address = string;

export class BridgeContracts extends Contracts {
  bridgeRouter: BridgeRouter;
  ethHelper: ETHHelper;

  constructor(br: Address, ethHelper: Address, signer?: ethers.Signer) {
    super(br, ethHelper, signer);
    this.bridgeRouter = new BridgeRouter__factory(signer).attach(br);
    this.ethHelper = new ETHHelper__factory(signer).attach(ethHelper);
  }

  connect(signer: ethers.Signer) {
    this.bridgeRouter = this.bridgeRouter.connect(signer);
    this.ethHelper = this.ethHelper.connect(signer);
  }

  static fromObject(data: any, signer?: ethers.Signer) {
    if (!data.bridgeRouter || !data.ethHelper) {
      throw new Error('missing address');
    }

    const br = data.bridgeRouter.proxy ?? data.bridgeRouter;
    const eh = data.bridgeRouter.proxy ?? data.bridgeRouter;

    return new BridgeContracts(br, eh);
  }

  static loadJson(filepath: string, signer?: ethers.Signer) {
    return this.fromObject(
      JSON.parse(fs.readFileSync(filepath, 'utf8')),
      signer,
    );
  }

  toObject(): any {
    return {
      bridgeRouter: this.bridgeRouter.address,
      ethHelper: this.ethHelper.address,
    };
  }
}

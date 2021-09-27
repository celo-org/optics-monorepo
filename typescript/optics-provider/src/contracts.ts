import { ethers } from 'ethers';

export abstract class Contracts {
  readonly args: any;

  constructor(...args: any) {
    this.args = args;
  }

  abstract toObject(): any;

  abstract connect(signer: ethers.Signer): void;
}

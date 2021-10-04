import { ethers } from 'ethers';

export abstract class Contracts {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly args: any[];

  constructor(...args: any[]) {
    this.args = args;
  }

  abstract connect(signer: ethers.Signer): void;
}

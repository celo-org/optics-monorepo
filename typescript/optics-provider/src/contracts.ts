import { ethers } from 'ethers';

export abstract class Contracts {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly args: any[];

  /**
   *
   * @param args Any arguments for the Contracts object.
   */
  constructor(...args: any[]) {
    this.args = args;
  }

  abstract connect(signer: ethers.Signer): void;
}

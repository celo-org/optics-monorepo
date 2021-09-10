import { ethers } from 'ethers';
import fs from 'fs';

export abstract class Contracts {
  readonly args: any;

  constructor(...args: any) {
    this.args = args;
  }

  abstract toObject(): any;

  abstract connect(signer: ethers.Signer): void;

  toJson(): string {
    return JSON.stringify(this.toObject());
  }

  toJsonPretty(): string {
    return JSON.stringify(this.toObject(), null, 2);
  }

  saveJson(filepath: string) {
    fs.writeFileSync(filepath, this.toJsonPretty());
  }
}

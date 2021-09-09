import fs from "fs";
import ethers from "ethers";
import * as core from "../../typechain/optics-core";
import {
  BridgeRouter,
  BridgeRouter__factory,
  ETHHelper,
  ETHHelper__factory,
} from "../../typechain/optics-xapps";

type Address = string;
type ProviderOrSigner = ethers.providers.Provider | ethers.Signer;

export abstract class Contracts {
  readonly original: Object;

  constructor(data: Object) {
    this.original = data;
  }

  abstract toObject(): Object;

  toJson(): string {
    return JSON.stringify(this.toObject());
  }

  toJsonPretty(): string {
    return JSON.stringify(this.toObject(), null, 2);
  }

  saveJson(filepath: string) {
    fs.writeFileSync(filepath, this.toJsonPretty());
  }

  static loadJson<T extends Contracts>(
    this: new (data: Object) => T,
    filepath: string
  ): T {
    let file = fs.readFileSync(filepath);
    return new this(file);
  }
}

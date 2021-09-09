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

interface ReplicaInfo {
  domain: number;
  address: Address;
}

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

export class BridgeContracts {
  bridgeRouter: BridgeRouter;
  ethHelper: ETHHelper;

  constructor(br: Address, ethHelper: Address, signer?: ethers.Signer) {
    this.bridgeRouter = new BridgeRouter__factory(signer).attach(br);
    this.ethHelper = new ETHHelper__factory(signer).attach(ethHelper);
  }

  connect(signer: ethers.Signer) {
    this.bridgeRouter = this.bridgeRouter.connect(signer);
    this.ethHelper = this.ethHelper.connect(signer);
  }

  fromObject(data: any, signer?: ethers.Signer) {
    if (!data.bridgeRouter || !data.ethHelper) {
      throw new Error("missing address");
    }

    const br = data.bridgeRouter.proxy ?? data.bridgeRouter;
    const eh = data.bridgeRouter.proxy ?? data.bridgeRouter;

    return new BridgeContracts(br, eh);
  }

  toObject(): Object {
    return {
      bridgeRouter: this.bridgeRouter.address,
      ethHelper: this.ethHelper.address,
    };
  }
}

export class CoreContracts {
  home: core.Home;
  replicas: Record<number, core.Replica>;

  constructor(home: Address, replicas: ReplicaInfo[], signer?: ethers.Signer) {
    this.home = new core.Home__factory(signer).attach(home);

    this.replicas = [];
    replicas.forEach((replica) => {
      this.replicas[replica.domain] = new core.Replica__factory(signer).attach(
        replica.address
      );
    });
  }

  toObject(): Object {

    const replicas: Record<number, string> = {};
    Object.entries(this.replicas).forEach(([k, v]) => {
      replicas[k] = v.address;
    });

    return {
      home: this.home.address,
      replicas:
    }
  }
}

import { ethers } from "ethers";
import {
  Home,
  Home__factory,
  Replica,
  Replica__factory,
} from "../../typechain/optics-core";
import { Contracts } from "./contracts";

type Address = string;

export interface ReplicaInfo {
  domain: string;
  address: Address;
}

export class CoreContracts extends Contracts {
  home: Home;
  replicas: Record<number, Replica>;

  constructor(home: Address, replicas: ReplicaInfo[], signer?: ethers.Signer) {
    super({});
    this.home = new Home__factory(signer).attach(home);

    this.replicas = [];
    replicas.forEach((replica) => {
      this.replicas[parseInt(replica.domain)] = new Replica__factory(
        signer
      ).attach(replica.address);
    });
  }

  toObject(): Object {
    const replicas: ReplicaInfo[] = [];
    Object.entries(this.replicas).forEach(([k, v]) => {
      replicas.push({ domain: k, address: v.address });
    });

    return {
      home: this.home.address,
      replicas: replicas,
    };
  }
}

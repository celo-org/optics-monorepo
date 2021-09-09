import fs from 'fs';

import { ethers } from 'ethers';
import {
  Home,
  Home__factory,
  Replica,
  Replica__factory,
} from '../../typechain/optics-core';
import { Contracts } from './contracts';

type Address = string;

export interface ReplicaInfo {
  domain: number;
  address: Address;
}

type InternalReplica = {
  domain: number;
  contract: Replica;
};

export class CoreContracts extends Contracts {
  private home: Home;
  private replicas: InternalReplica[];

  constructor(home: Address, replicas: ReplicaInfo[], signer?: ethers.Signer) {
    super(home, replicas, signer);
    this.home = new Home__factory(signer).attach(home);

    this.replicas = replicas.map((replica) => {
      return {
        contract: new Replica__factory(signer).attach(replica.address),
        domain: replica.domain,
      };
    });
  }

  connect(signer: ethers.Signer) {
    this.home = this.home.connect(signer);
    this.replicas = this.replicas.map((replica) => {
      return {
        contract: replica.contract.connect(signer),
        domain: replica.domain,
      };
    });
  }

  toObject(): any {
    const replicas: ReplicaInfo[] = this.replicas.map((replica) => {
      return {
        domain: replica.domain,
        address: replica.contract.address,
      };
    });

    return {
      home: this.home.address,
      replicas: replicas,
    };
  }

  static fromObject(data: any, signer?: ethers.Signer): CoreContracts {
    if (!data.home || !data.replicas) {
      throw new Error('Missing key');
    }
    return new CoreContracts(data.home, data.replicas, signer);
  }

  static loadJson(filepath: string, signer?: ethers.Signer) {
    return this.fromObject(
      JSON.parse(fs.readFileSync(filepath, 'utf8')),
      signer,
    );
  }
}

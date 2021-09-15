import fs from 'fs';

import { ethers } from 'ethers';
import {
  Home,
  Home__factory,
  Replica,
  Replica__factory,
} from '@optics-xyz/ts-interface/optics-core';
import { Contracts } from '../../contracts';
import { ReplicaInfo } from '../domains/domain';

type Address = string;

type InternalReplica = {
  domain: number;
  contract: Replica;
};

export class CoreContracts extends Contracts {
  readonly domain;
  home: Home;
  replicas: Map<number, InternalReplica>;

  constructor(
    domain: number,
    home: Address,
    replicas: ReplicaInfo[],
    signer?: ethers.Signer,
  ) {
    super(domain, home, replicas, signer);
    this.domain = domain;
    this.home = new Home__factory(signer).attach(home);

    this.replicas = new Map();
    replicas.forEach((replica) => {
      this.replicas.set(replica.domain, {
        contract: new Replica__factory(signer).attach(replica.address),
        domain: replica.domain,
      });
    });
  }

  connect(providerOrSigner: ethers.providers.Provider | ethers.Signer): void {
    this.home = this.home.connect(providerOrSigner);

    Array.from(this.replicas.values()).forEach((replica: InternalReplica) => {
      replica.contract = replica.contract.connect(providerOrSigner);
    });
  }

  toObject(): any {
    const replicas: ReplicaInfo[] = Array.from(this.replicas.values()).map(
      (replica) => {
        return {
          domain: replica.domain,
          address: replica.contract.address,
        };
      },
    );

    return {
      home: this.home.address,
      replicas: replicas,
    };
  }

  static fromObject(data: any, signer?: ethers.Signer): CoreContracts {
    if (!data.domain || !data.home || !data.replicas) {
      throw new Error('Missing key');
    }
    return new CoreContracts(data.domain, data.home, data.replicas, signer);
  }

  static loadJson(filepath: string, signer?: ethers.Signer) {
    return this.fromObject(
      JSON.parse(fs.readFileSync(filepath, 'utf8')),
      signer,
    );
  }
}

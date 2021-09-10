import fs from 'fs';

import { ethers } from 'ethers';
import {
  Home,
  Home__factory,
  Replica,
  Replica__factory,
} from '../../../typechain/optics-core';
import { Contracts } from '../contracts/contracts';
import { ReplicaInfo } from './OpticsDomain';

type Address = string;

type InternalReplica = {
  domain: number;
  contract: Replica;
};

export class CoreContracts extends Contracts {
  readonly domain;
  home: Home;
  replicas: InternalReplica[];

  constructor(
    domain: number,
    home: Address,
    replicas: ReplicaInfo[],
    signer?: ethers.Signer,
  ) {
    super(domain, home, replicas, signer);
    this.domain = domain;
    this.home = new Home__factory(signer).attach(home);

    this.replicas = replicas.map((replica) => {
      return {
        contract: new Replica__factory(signer).attach(replica.address),
        domain: replica.domain,
      };
    });
  }

  connect(providerOrSigner: ethers.providers.Provider | ethers.Signer): void {
    this.home = this.home.connect(providerOrSigner);
    this.replicas = this.replicas.map((replica) => {
      return {
        contract: replica.contract.connect(providerOrSigner),
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
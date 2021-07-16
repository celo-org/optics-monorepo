import * as ethers from 'ethers';
import { BigNumber } from 'ethers';
import { NonceManager } from '@ethersproject/experimental';
import { BeaconProxy, ProxyAddresses } from './proxyUtils';
import * as contracts from '../../typechain/optics-core';

type Address = string;

// Optic's complete contract suite
export type Contracts = {
  upgradeBeaconController?: contracts.UpgradeBeaconController;
  xAppConnectionManager?: contracts.XAppConnectionManager;
  updaterManager?: contracts.UpdaterManager;
  governance?: BeaconProxy<contracts.GovernanceRouter>;
  home?: BeaconProxy<contracts.Home>;
  replicas: Record<number, BeaconProxy<contracts.Replica>>;
};

export type ContractDeployOutput = {
  upgradeBeaconController: string;
  xappConnectionManager: string;
  updaterManager: string;
  governance: ProxyAddresses;
  home: ProxyAddresses;
  replicas?: Record<string, ProxyAddresses>;
};

/**
 * Converts entire contract suite to json
 *
 * @param contracts - The contracts
 */
export function toJson(contracts: Contracts): string {
  const replicas: Record<string, ProxyAddresses> = {};
  Object.entries(contracts.replicas).forEach(([k, v]) => {
    replicas[k] = {
      implementation: v.implementation.address,
      proxy: v.proxy.address,
      beacon: v.beacon.address,
    };
  });

  const deployOutput: ContractDeployOutput = {
    upgradeBeaconController: contracts.upgradeBeaconController!.address,
    xappConnectionManager: contracts.xAppConnectionManager!.address,
    updaterManager: contracts.updaterManager!.address,
    governance: {
      implementation: contracts.governance!.implementation.address,
      proxy: contracts.governance!.proxy.address,
      beacon: contracts.governance!.beacon.address,
    },
    home: {
      implementation: contracts.home!.implementation.address,
      proxy: contracts.home!.proxy.address,
      beacon: contracts.home!.beacon.address,
    },
    replicas,
  };

  return JSON.stringify(
    deployOutput,
    null,
    2,
  );
}

export interface ChainConfig {
  name: string;
  rpc: string;
  deployerKey?: string;
  gasPrice?: ethers.BigNumberish;
  confirmations?: number;
};

// config for generating a Chain
export interface OpticsChainConfig extends ChainConfig {
  domain: number;
  updater: Address;
  recoveryManager: Address;
  watchers?: Address[];
  recoveryTimelock: number;
  optimisticSeconds: number;
}

export type Chain = {
  name: string;
  provider: ethers.providers.Provider;
  deployer: ethers.Signer;
  gasPrice: ethers.BigNumber;
  config: ChainConfig;
  confirmations: number;
};

// deserialized version of the ChainConfig
export type OpticsChain = Chain & {
  domain: number;
  updater: Address;
  recoveryTimelock: number;
  recoveryManager: Address;
  optimisticSeconds: number;
  watchers: Address[];
};

export type ContractVerificationInput = {
  name: string;
  address: Address;
  constructorArguments: any[];
};

export class Deploy {
  readonly chain: OpticsChain;
  contracts: Contracts;
  verificationInput: ContractVerificationInput[];
  readonly test?: boolean;

  constructor(chain: OpticsChain, test: boolean = false) {
    this.chain = chain;
    this.contracts = { replicas: {} };
    this.verificationInput = [];
    this.test = test;
  }

  static freshFromConfig(config: OpticsChainConfig): Deploy {
    return new Deploy(toOpticsChain(config));
  }

  get deployer(): ethers.Signer {
    return this.chain.deployer;
  }

  get provider(): ethers.providers.Provider {
    return this.chain.provider;
  }

  get supports1559(): boolean {
    let notSupported = ['kovan', 'alfajores', 'baklava', 'celo'];
    return notSupported.indexOf(this.chain.name) === -1;
  }

  // this is currently a kludge to account for ethers issues
  get overrides(): ethers.Overrides {
    return {
      type: this.supports1559 ? 2 : 0,
      gasPrice: this.chain.gasPrice,
      gasLimit: this.supports1559 ? undefined : 5_000_000,
    };
  }
}

export function toChain(config:ChainConfig): Chain {
  const provider = new ethers.providers.JsonRpcProvider(config.rpc);
  const signer = new ethers.Wallet(config.deployerKey!, provider);
  const deployer = new NonceManager(signer);
  return {
    name: config.name,
    provider,
    deployer,
    confirmations: config.confirmations ?? 5,
    gasPrice: BigNumber.from(config.gasPrice ?? '20000000000'),
    config,
  };
}

/**
 * Builds Chain from config
 *
 * @param config - The chain config
 */
export function toOpticsChain(config: OpticsChainConfig): OpticsChain {
  const chain = toChain(config);
  return {
    ...chain,
    domain: config.domain,
    updater: config.updater,
    watchers: config.watchers ?? [],
    recoveryManager: config.recoveryManager,
    recoveryTimelock: config.recoveryTimelock,
    optimisticSeconds: config.optimisticSeconds,
  };
}

/**
 * Instantiates a new deploy instance
 *
 * @param config - The chain config
 */
export function freshDeploy(config: OpticsChainConfig): Deploy {
  return Deploy.freshFromConfig(config);
}

type RustSigner = {
  key: string;
  type: string; // TODO
};

type RustConnection = {
  url: string;
  type: string; // TODO
};

type RustContractBlock = {
  address: string;
  domain: string;
  name: string;
  rpcStyle: string; // TODO
  connection: RustConnection;
};

type RustConfig = {
  signers: Record<string, RustSigner>;
  replicas: Record<string, RustContractBlock>;
  home: RustContractBlock;
  tracing: {
    level: string;
    style: string;
  };
  db: string;
};

export function buildConfig(local: Deploy, remotes: Deploy[]): RustConfig {
  const home = {
    address: local.contracts.home!.proxy.address,
    domain: local.chain.domain.toString(),
    name: local.chain.name,
    rpcStyle: 'ethereum', // TODO
    connection: {
      type: 'http', // TODO
      url: local.chain.config!.rpc,
    },
  };

  const rustConfig: RustConfig = {
    signers: {
      [home.name]: { key: '', type: 'hexKey' },
    },
    replicas: {},
    home,
    tracing: {
      level: 'debug',
      style: 'pretty',
    },
    db: 'db_path',
  };

  for (var remote of remotes) {
    const replica = {
      address: remote.contracts.replicas[local.chain.domain].proxy.address,
      domain: remote.chain.domain.toString(),
      name: remote.chain.name,
      rpcStyle: 'ethereum',
      connection: {
        type: 'http',
        url: remote.chain.config!.rpc,
      },
    };

    rustConfig.signers[replica.name] = { key: '', type: 'hexKey' };
    rustConfig.replicas[replica.name] = replica;
  }

  return rustConfig;
}

export function toRustConfigs(deploys: Deploy[]): RustConfig[] {
  let configs: RustConfig[] = [];
  for (let i = 0; i < deploys.length; i++) {
    const local = deploys[i];

    // copy array so original is not altered
    const remotes = deploys
      .slice()
      .filter((remote) => remote.chain.domain !== local.chain.domain);

    // build and add new config
    configs.push(buildConfig(local, remotes));
  }
  return configs;
}

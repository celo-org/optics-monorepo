import * as ethers from 'ethers';
import { BigNumber } from 'ethers';
import { BeaconProxy, ProxyAddresses } from './proxyUtils';
import * as contracts from './typechain';

export type Address = string;

export type Contracts = {
  upgradeBeaconController?: contracts.UpgradeBeaconController;
  xappConnectionManager?: contracts.XAppConnectionManager;
  updaterManager?: contracts.UpdaterManager;

  governance?: BeaconProxy<contracts.GovernanceRouter>;
  home?: BeaconProxy<contracts.Home>;
  replicas: Record<number, BeaconProxy<contracts.Replica>>;
};

export function toJson(contracts: Contracts): string {
  const replicas: Record<string, ProxyAddresses> = {};
  Object.entries(contracts.replicas).forEach(([k, v]) => {
    replicas[k] = {
      implementation: v.implementation.address,
      proxy: v.proxy.address,
      beacon: v.beacon.address,
    };
  });

  return JSON.stringify(
    {
      upgradeBeaconController: contracts.upgradeBeaconController!.address,
      xappConnectionManager: contracts.xappConnectionManager!.address,
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
    },
    null,
    2,
  );
}

export interface ChainConfig {
  name: string;
  rpc: string;
  deployerKey: string;
  domain: number;
  updater: Address;
  optimisticSeconds: number;
  watchers?: Address[];
  gasPrice?: ethers.BigNumberish;
}

export type Chain = {
  name: string;
  config: ChainConfig;
  provider: ethers.providers.Provider;
  deployer: ethers.Signer;
  domain: number;
  updater: Address;
  optimisticSeconds: number;
  watchers: Address[];
  gasPrice: ethers.BigNumber;
};

export type Deploy = {
  chain: Chain;
  contracts: Contracts;
};

export function toChain(config: ChainConfig): Chain {
  const provider = new ethers.providers.JsonRpcProvider(config.rpc);
  const deployer = new ethers.Wallet(config.deployerKey, provider);
  return {
    name: config.name,
    config: config,
    provider,
    deployer,
    domain: config.domain,
    updater: config.updater,
    optimisticSeconds: config.optimisticSeconds,
    watchers: config.watchers ?? [],
    gasPrice: BigNumber.from(config.gasPrice ?? '20000000000'),
  };
}

export function freshDeploy(config: ChainConfig): Deploy {
  return {
    chain: toChain(config),
    contracts: { replicas: {} },
  };
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
  domain: number;
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
  dbPath: string;
};

function buildConfig(left: Deploy, right: Deploy): RustConfig {
  const replica = {
    address: right.contracts.replicas[left.chain.domain].proxy.address,
    domain: right.chain.domain,
    name: right.chain.name,
    rpcStyle: 'ethereum',
    connection: {
      type: 'http',
      url: right.chain.config.rpc,
    },
  };
  const home = {
    address: left.contracts.home!.proxy.address,
    domain: left.chain.domain,
    name: left.chain.name,
    rpcStyle: 'ethereum', // TODO
    connection: {
      type: 'http', // TODO
      url: left.chain.config.rpc,
    },
  };

  return {
    signers: { [replica.name]: { key: '', type: 'hexKey' } },
    replicas: { [replica.name]: replica },
    home,
    tracing: {
      level: 'debug',
      style: 'pretty',
    },
    dbPath: 'db_path',
  };
}

export function toRustConfigs(
  left: Deploy,
  right: Deploy,
): [RustConfig, RustConfig] {
  return [buildConfig(left, right), buildConfig(right, left)];
}

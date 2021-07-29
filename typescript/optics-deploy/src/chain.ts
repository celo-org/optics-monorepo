import * as ethers from 'ethers';
import { BigNumber } from 'ethers';
import { NonceManager } from '@ethersproject/experimental';
import { ProxyAddresses } from './proxyUtils';
import { CoreConfig, CoreDeploy, Deploy } from './deploy';

type Address = string;

export type CoreContractDeployOutput = {
  upgradeBeaconController: string;
  xappConnectionManager: string;
  updaterManager: string;
  governance: ProxyAddresses;
  home: ProxyAddresses;
  replicas?: Record<string, ProxyAddresses>;
};

export interface ChainConfig {
  name: string;
  rpc: string;
  deployerKey?: string;
  gasPrice?: ethers.BigNumberish;
  confirmations?: number;
  domain: number;
}

// config for generating a Chain
export interface OpticsChainConfig extends ChainConfig {
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
  domain: number;
};

// deserialized version of the ChainConfig
export type OpticsConfig = {
  updater: Address;
  recoveryTimelock: number;
  recoveryManager: Address;
  optimisticSeconds: number;
  watchers: Address[];
};

export function toChain(config: ChainConfig): Chain {
  const provider = new ethers.providers.JsonRpcProvider(config.rpc);
  const signer = new ethers.Wallet(config.deployerKey!, provider);
  const deployer = new NonceManager(signer);
  return {
    domain: config.domain,
    name: config.name,
    provider,
    deployer,
    confirmations: config.confirmations ?? 5,
    gasPrice: BigNumber.from(config.gasPrice ?? '20000000000'),
    config,
  };
}

export type RustSigner = {
  key: string;
  type: string; // TODO
};

export type RustConnection = {
  url: string;
  type: string; // TODO
};

export type RustContractBlock = {
  address: string;
  domain: string;
  name: string;
  rpcStyle: string; // TODO
  connection: RustConnection;
};

export type RustConfig = {
  signers: Record<string, RustSigner>;
  replicas: Record<string, RustContractBlock>;
  home: RustContractBlock;
  tracing: {
    level: string;
    style: string;
  };
  db: string;
};

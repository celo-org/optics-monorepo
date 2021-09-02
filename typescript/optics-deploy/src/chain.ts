import * as ethers from 'ethers';
import { BigNumber } from 'ethers';
import { NonceManager } from '@ethersproject/experimental';
import { ProxyAddresses } from './proxyUtils';
import { Address } from '../../optics-tests/lib/types';

export type DeployEnvironment = 'dev' | 'staging' | 'prod';

export type CoreContractAddresses = {
  upgradeBeaconController: Address;
  xAppConnectionManager: Address;
  updaterManager: Address;
  governance: ProxyAddresses;
  home: ProxyAddresses;
  replicas?: Record<string, ProxyAddresses>;
};

export type CoreDeployAddresses = CoreContractAddresses & {
  recoveryManager: Address;
  updater: Address;
  governor?: { address: Address; domain: number };
};

export interface ChainJson {
  name: string;
  rpc: string;
  domain: number;
  deployerKey?: string;
  gasLimit?: ethers.BigNumberish;
  gasPrice?: ethers.BigNumberish;
  confirmations?: number;
}

export type Chain = {
  name: string;
  provider: ethers.providers.JsonRpcProvider;
  deployer: ethers.Signer;
  gasPrice: ethers.BigNumber;
  gasLimit: ethers.BigNumber;
  config: ChainJson;
  confirmations: number;
  domain: number;
};

export function deployEnvironment(): DeployEnvironment {
  const e = process.env.OPTICS_DEPLOY_ENVIRONMENT;

  if (e === 'staging') {
    return 'staging';
  } else if (e === 'prod') {
    return 'prod';
  }

  return 'dev';
}

export function toChain(config: ChainJson): Chain {
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
    gasLimit: BigNumber.from(config.gasLimit ?? 6_000_000),
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
  environment: string;
  signers: Record<string, RustSigner>;
  replicas: Record<string, RustContractBlock>;
  home: RustContractBlock;
  tracing: {
    level: string;
    fmt: 'json';
  };
  db: string;
};

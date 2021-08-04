import * as ethers from 'ethers';
import { BigNumber } from 'ethers';
import { NonceManager } from '@ethersproject/experimental';
import { ProxyAddresses } from './proxyUtils';

export type CoreContractDeployOutput = {
  upgradeBeaconController: string;
  xAppConnectionManager: string;
  updaterManager: string;
  governance: ProxyAddresses;
  home: ProxyAddresses;
  replicas?: Record<string, ProxyAddresses>;
};

export interface ChainJson {
  name: string;
  rpc: string;
  deployerKey?: string;
  gasPrice?: ethers.BigNumberish;
  confirmations?: number;
  domain: number;
}

export type Chain = {
  name: string;
  provider: ethers.providers.Provider;
  deployer: ethers.Signer;
  gasPrice: ethers.BigNumber;
  config: ChainJson;
  confirmations: number;
  domain: number;
};

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

import { ChainJson, toChain } from '../../src/chain';
import * as dotenv from 'dotenv';
import { CoreConfig } from '../../src/core/CoreDeploy';
import { BridgeConfig } from '../../src/bridge/BridgeDeploy';

dotenv.config();

const rpc = process.env.CELO_RPC;
if (!rpc) {
  throw new Error('Missing RPC URI');
}

export const chainJson: ChainJson = {
  name: 'celo',
  rpc,
  deployerKey: process.env.CELO_DEPLOYER_KEY,
  domain: 0x63656c6f, // b'eth' interpreted as an int
};

export const chain = toChain(chainJson);

// TODO
export const config: CoreConfig = {
  environment: 'prod',
  updater: '0xDB2091535eb0Ee447Ce170DDC25204FEA822dd81',
  watchers: ['0xeE42B7757798cf495CDaA8eDb0CC237F07c60C81'],
  recoveryManager: '', // TODO
  optimisticSeconds: 60 * 60 * 3, // 3 hours
  recoveryTimelock: 60 * 60 * 24, // 1 day
};

export const bridgeConfig: BridgeConfig = {};

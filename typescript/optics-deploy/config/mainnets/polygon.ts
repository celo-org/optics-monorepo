import { ChainJson, toChain } from '../../src/chain';
import * as dotenv from 'dotenv';
import { CoreConfig } from '../../src/core/CoreDeploy';
import { BridgeConfig } from '../../src/bridge/BridgeDeploy';

dotenv.config();

const rpc = process.env.POLYGON_RPC;
if (!rpc) {
  throw new Error('Missing RPC URI');
}

export const chainJson: ChainJson = {
  name: 'polygon',
  rpc,
  deployerKey: process.env.POLYGON_KEY,
  domain: 0x706f6c79, // b'poly' interpreted as an int
};

export const chain = toChain(chainJson);

// TODO
export const config: CoreConfig = {
  environment: 'prod',
  updater: '0xDB2091535eb0Ee447Ce170DDC25204FEA822dd81',
  watchers: ['0xeE42B7757798cf495CDaA8eDb0CC237F07c60C81'],
  recoveryManager: '0x3D9330014952Bf0A3863FEB7a657bfFA5C9D40B9',
  optimisticSeconds: 60 * 60 * 3, // 3 hours
  recoveryTimelock: 60 * 60 * 24, // 1 day
};

export const bridgeConfig: BridgeConfig = {
  weth: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270', // Actually WMATIC but ok
};

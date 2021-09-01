import { ChainJson, toChain } from '../../src/chain';
import * as dotenv from 'dotenv';
import { CoreConfig } from '../../src/core/CoreDeploy';
import { BridgeConfig } from '../../src/bridge/BridgeDeploy';

dotenv.config();

const rpc = process.env.ETHEREUM_RPC;
if (!rpc) {
  throw new Error('Missing RPC URI');
}

export const chainJson: ChainJson = {
  name: 'ethereum',
  rpc,
  deployerKey: process.env.ETHEREUM_DEPLOYER_KEY,
  domain: 0x657468, // b'eth' interpreted as an int
};

export const chain = toChain(chainJson);

export const config: CoreConfig = {
  environment: 'prod',
  updater: '0xDB2091535eb0Ee447Ce170DDC25204FEA822dd81',
  watchers: ['0xeE42B7757798cf495CDaA8eDb0CC237F07c60C81'],
  recoveryManager: '0x3D9330014952Bf0A3863FEB7a657bfFA5C9D40B9',
  governor: {
    domain: chainJson.domain,
    address: '0x04c0Ba808bF45476A6A031aa86b69e7FbAe8c56C',
  },
  optimisticSeconds: 60 * 60 * 3, // 3 hours
  recoveryTimelock: 60 * 60 * 24, // 1 day
};

export const bridgeConfig: BridgeConfig = {
  weth: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
};

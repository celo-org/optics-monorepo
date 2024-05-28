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
  deployerKey: process.env.POLYGON_DEPLOYER_KEY,
  domain: 0x706f6c79, // b'poly' interpreted as an int
  gasPrice: '120000000000' // 120 gwei
};

export const chain = toChain(chainJson);

export const config: CoreConfig = {
  environment: 'prod-community',
  updater: '0x65Fb23bDaD54574713AD756EFE16ce2eEb1F5855',
  recoveryTimelock: 60 * 60 * 24 * 14, // 14 days
  recoveryManager: '0x8A1405C70c8a45177b5ac71b1d22779272E5d48b',
  optimisticSeconds: 60 * 30, // 30 minutes
  watchers: ['0x68015B84182c71F9c2EE6C8061405D6F1f56314B'],
  // governor: {},
  processGas: 850_000,
  reserveGas: 15_000,
};

export const bridgeConfig: BridgeConfig = {
  weth: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270', // Actually WMATIC but ok
};

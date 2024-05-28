import { ChainJson, toChain } from '../../src/chain';
import * as dotenv from 'dotenv';
import { CoreConfig } from '../../src/core/CoreDeploy';
import { BridgeConfig } from '../../src/bridge/BridgeDeploy';

dotenv.config();

const rpc = process.env.ALFAJORES_RPC;
if (!rpc) {
  throw new Error('Missing RPC URI');
}

export const chainJson: ChainJson = {
  name: 'alfajores',
  rpc,
  deployerKey: process.env.ALFAJORES_DEPLOYER_KEY,
  domain: 1000,
};

export const chain = toChain(chainJson);

export const devConfig: CoreConfig = {
  environment: 'dev',
  updater: '0x4177372FD9581ceb2367e0Ce84adC5DAD9DF8D55',
  watchers: ['0x20aC2FD664bA5406A7262967C34107e708dCb18E'],
  recoveryManager: '0x24F6c874F56533d9a1422e85e5C7A806ED11c036',
  optimisticSeconds: 10,
  recoveryTimelock: 180,
  processGas: 850_000,
  reserveGas: 15_000,
};

export const stagingConfig: CoreConfig = {
  environment: 'staging',
  updater: '0x201dd86063Dc251cA5a576d1b7365C38e5fB4CD5',
  watchers: ['0x22B2855635154Baa41C306BcA979C8c9a077A180'],
  recoveryManager: '0x24F6c874F56533d9a1422e85e5C7A806ED11c036',
  optimisticSeconds: 10,
  recoveryTimelock: 180,
  processGas: 850_000,
  reserveGas: 15_000,
};

export const stagingCommunityConfig: CoreConfig = {
  environment: 'staging-community',
  updater: '0xf0B3C01E16cE288f7Cd7112B4b2F5A859Ba72307',
  watchers: ['0xC3Ef93917f0d0AC4D70E675824270b290E0a2667'],
  recoveryManager: '0x075fE802D26a983423caE0a16b8250F155AbeB03',
  optimisticSeconds: 10,
  recoveryTimelock: 180,
  processGas: 850_000,
  reserveGas: 15_000,
};

export const bridgeConfig: BridgeConfig = {};

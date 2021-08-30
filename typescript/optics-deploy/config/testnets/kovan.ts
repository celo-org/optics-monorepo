import * as dotenv from 'dotenv';

import { ChainJson, toChain } from '../../src/chain';
import { CoreConfig } from '../../src/core/CoreDeploy';
import { BridgeConfig } from '../../src/bridge/BridgeDeploy';
import { BigNumber } from 'ethers';

dotenv.config();

const rpc = process.env.KOVAN_RPC;
if (!rpc) {
  throw new Error('Missing RPC URI');
}

const chainJson: ChainJson = {
  name: 'kovan',
  rpc,
  deployerKey: process.env.KOVAN_DEPLOYER_KEY,
  domain: 3000,
  gasPrice: BigNumber.from(10_000_000_000),
};

export const chain = toChain(chainJson);

export const devConfig: CoreConfig = {
  environment: 'dev',
  updater: '0x4177372FD9581ceb2367e0Ce84adC5DAD9DF8D55',
  optimisticSeconds: 10,
  watchers: ['0x20aC2FD664bA5406A7262967C34107e708dCb18E'],
  recoveryTimelock: 180,
  recoveryManager: '0x24F6c874F56533d9a1422e85e5C7A806ED11c036',
};

export const stagingConfig: CoreConfig = {
  environment: 'staging',
  updater: '0x201dd86063Dc251cA5a576d1b7365C38e5fB4CD5',
  watchers: ['0x22B2855635154Baa41C306BcA979C8c9a077A180'],
  recoveryManager: '0x24F6c874F56533d9a1422e85e5C7A806ED11c036',
  optimisticSeconds: 10,
  recoveryTimelock: 180,
};

export const bridgeConfig: BridgeConfig = {
  weth: '0xd0a1e359811322d97991e03f863a0c30c2cf029c',
};

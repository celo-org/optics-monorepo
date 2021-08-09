import * as dotenv from 'dotenv';

import { ChainJson, toChain } from '../src/chain';
import { CoreConfig } from '../src/core/CoreDeploy';
import { BridgeConfig } from '../src/bridge/BridgeDeploy';
import { BigNumber } from 'ethers';

dotenv.config();

const chainJson: ChainJson = {
  name: 'kovan',
  rpc: 'https://kovan.infura.io/v3/5c456d7844fa40a683e934df60534c60',
  deployerKey: process.env.KOVAN_DEPLOYER_KEY,
  domain: 3000,
  gasPrice: BigNumber.from(10_000_000_000),
};

export const chain = toChain(chainJson);

export const config: CoreConfig = {
  updater: '0x4177372FD9581ceb2367e0Ce84adC5DAD9DF8D55',
  optimisticSeconds: 10,
  watchers: ['0x20aC2FD664bA5406A7262967C34107e708dCb18E'],
  recoveryTimelock: 180,
  recoveryManager: '0x24F6c874F56533d9a1422e85e5C7A806ED11c036',
};

export const bridgeConfig: BridgeConfig = {
  weth: '0xd0a1e359811322d97991e03f863a0c30c2cf029c',
};

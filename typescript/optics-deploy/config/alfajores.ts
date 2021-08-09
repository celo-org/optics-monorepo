import { ChainJson, toChain } from '../src/chain';
import * as dotenv from 'dotenv';
import { CoreConfig } from '../src/core/CoreDeploy';
import { BridgeConfig } from '../src/bridge/BridgeDeploy';
dotenv.config();

export const chainJson: ChainJson = {
  name: 'alfajores',
  rpc: 'https://alfajores-forno.celo-testnet.org',
  deployerKey: process.env.ALFAJORES_DEPLOYER_KEY,
  domain: 1000,
};

export const chain = toChain(chainJson);

export const config: CoreConfig = {
  updater: '0x4177372FD9581ceb2367e0Ce84adC5DAD9DF8D55',
  watchers: ['0x20aC2FD664bA5406A7262967C34107e708dCb18E'],
  recoveryManager: '0x24F6c874F56533d9a1422e85e5C7A806ED11c036',
  optimisticSeconds: 10,
  recoveryTimelock: 180,
};

export const bridgeConfig: BridgeConfig = {};

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
  domain: 0x63656c6f, // b'celo' interpreted as an int
};

export const chain = toChain(chainJson);

export const config: CoreConfig = {
  environment: 'prod-community',
  updater: '0x703643995262c92ab013E3CCA810BdcB9239d45a',
  recoveryTimelock: 60 * 60 * 24 * 14, // 14 days
  recoveryManager: '0x070c2843402Aa0637ae0F2E2edf601aAB5E72509',
  optimisticSeconds: 60 * 30, // 30 minutes
  watchers: ['0x97D510A1F9464d220E2716Cc52Cb03851D6d595c'],
  governor: {
    domain: chainJson.domain,
    address: '0x070c2843402Aa0637ae0F2E2edf601aAB5E72509',
  },
  processGas: 850_000,
  reserveGas: 15_000,
};

export const bridgeConfig: BridgeConfig = {};

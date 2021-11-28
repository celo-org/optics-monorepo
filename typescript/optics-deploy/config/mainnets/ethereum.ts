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
  // This isn't actually used because Ethereum supports EIP 1559 - but just in case
  gasPrice: '400000000000', // 400 gwei
  // EIP 1559 params
  maxFeePerGas: '400000000000', // 400 gwei
  maxPriorityFeePerGas: '4000000000', // 4 gwei
};

export const chain = toChain(chainJson);

export const config: CoreConfig = {
  environment: 'prod-community',
  updater: '0x5Ef6e0F6A7E1f866612D806041799a9D762b62c0',
  recoveryTimelock: 60 * 60 * 24 * 14, // 14 days
  recoveryManager: '0x2bb2a5a724170357cb691841f40d26a950d8c33d',
  optimisticSeconds: 60 * 30, // 30 minutes
  watchers: ['0xD0D09d9CF712ccE87141Dfa22a3aBBDb7B1c296e'],
  // governor: {},
  processGas: 850_000,
  reserveGas: 15_000,
};

export const bridgeConfig: BridgeConfig = {
  weth: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
};

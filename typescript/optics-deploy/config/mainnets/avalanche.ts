import { ChainJson, toChain } from '../../src/chain';
import * as dotenv from 'dotenv';
import { CoreConfig } from '../../src/core/CoreDeploy';
import { BridgeConfig } from '../../src/bridge/BridgeDeploy';
import { BigNumber } from 'ethers';

dotenv.config();

const rpc = process.env.AVALANCHE_RPC;
if (!rpc) {
  throw new Error('Missing RPC URI');
}

export const chainJson: ChainJson = {
  name: 'avalanche',
  rpc,
  deployerKey: process.env.AVALANCHE_DEPLOYER_KEY,
  domain: 0x61766178, // b'avax' interpreted as an int
  // This isn't actually used because Avalanche supports EIP 1559 - but just in case
  gasPrice: BigNumber.from(225_000_000_000), // 225 nAVAX (225 gwei)
  // EIP 1559 params
  maxFeePerGas: '225000000000', // 225 nAVAX (225 gwei)
  maxPriorityFeePerGas: '10000000000', // 10 nAVAX (10 gwei)
};

export const chain = toChain(chainJson);

export const config: CoreConfig = {
  environment: 'prod-community',
  updater: '0x6e29236E86a039F8225834F7E7cd4122dc166e51',
  recoveryTimelock: 60 * 60 * 24 * 14, // 14 days
  recoveryManager: '0x8a11d528d12ea09ccbf86e21B7813812b53a6900',
  optimisticSeconds: 60 * 30, // 30 minutes
  watchers: ['0x74C1580f920E4d694502Ca95838d6382caecb1dE'],
  // governor: {},
  processGas: 850_000,
  reserveGas: 15_000,
};

export const bridgeConfig: BridgeConfig = {
  weth: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // Actually WAVAX but ok
};

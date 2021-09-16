import { ethers } from 'hardhat';

import {
  CoreConfig,
  CoreDeploy,
} from '@optics-xyz/deploy/dist/src/core/CoreDeploy';
import { Chain } from '@optics-xyz/deploy/dist/src/chain';

const { BigNumber } = ethers;

export async function getTestChain(
  domain: number,
  updater: string,
  watchers: string[],
  recoveryManager?: string,
): Promise<[Chain, CoreConfig]> {
  const [, , , , , , , deployer] = await ethers.getSigners();
  return [
    {
      name: 'hh',
      provider: ethers.provider,
      deployer,
      gasPrice: BigNumber.from(20000000000),
      gasLimit: BigNumber.from(6_000_000),
      confirmations: 0,
      domain,
      config: {
        domain,
        name: 'hh',
        rpc: 'NA',
      },
    },
    {
      environment: 'dev',
      recoveryTimelock: 1,
      recoveryManager: recoveryManager || ethers.constants.AddressZero,
      updater,
      optimisticSeconds: 3,
      watchers,
      processGas: 850_000,
      reserveGas: 15_000,
    },
  ];
}

export async function getTestDeploy(
  domain: number,
  updater: string,
  watchers: string[],
  recoveryManager?: string,
): Promise<CoreDeploy> {
  const [chain, config] = await getTestChain(
    domain,
    updater,
    watchers,
    recoveryManager,
  );
  return new CoreDeploy(chain, config, true);
}

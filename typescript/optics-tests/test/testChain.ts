import { ethers } from 'hardhat';
import { Chain } from '../../optics-deploy/src/chain';
const { BigNumber } = ethers;

import {
  CoreConfig,
  CoreDeploy,
} from '../../optics-deploy/src/core/CoreDeploy';

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
      gasPrice: BigNumber.from('20000000000'),
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

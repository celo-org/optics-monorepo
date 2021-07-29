import { ethers } from 'hardhat';
import { Chain } from '../../optics-deploy/src/chain';
const { BigNumber } = ethers;

import {
  CoreConfig,
  CoreDeploy as Deploy,
} from '../../optics-deploy/src/deploy';

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
      recoveryTimelock: 1,
      recoveryManager: recoveryManager || ethers.constants.AddressZero,
      updater,
      optimisticSeconds: 3,
      watchers,
    },
  ];
}

export async function getTestDeploy(
  domain: number,
  updater: string,
  watchers: string[],
  recoveryManager?: string,
): Promise<Deploy> {
  const [chain, config] = await getTestChain(
    domain,
    updater,
    watchers,
    recoveryManager,
  );
  return new Deploy(chain, config, true);
}

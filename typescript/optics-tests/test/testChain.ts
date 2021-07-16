import { ethers } from 'hardhat';
const { BigNumber } = ethers;

import {Deploy, OpticsChain} from '../../optics-deploy/src/chain';

export async function getTestChain(
  domain: number,
  updater: string,
  watchers: string[],
  recoveryManager?: string,
): Promise<OpticsChain> {
  const [, , , , , , , deployer] = await ethers.getSigners();
  return {
    name: 'hh',
    provider: ethers.provider,
    deployer,
    domain,
    recoveryTimelock: 1,
    recoveryManager: recoveryManager || ethers.constants.AddressZero,
    updater,
    optimisticSeconds: 3,
    watchers,
    gasPrice: BigNumber.from('20000000000'),
    confirmations: 0,
    config: {
      name: "hh",
      rpc: "NA"
    }
  };
}

export async function getTestDeploy(
  domain: number,
  updater: string,
  watchers: string[],
  recoveryManager?: string,
): Promise<Deploy> {
  const chain = await getTestChain(domain, updater, watchers, recoveryManager);
  return new Deploy(chain, true);
}

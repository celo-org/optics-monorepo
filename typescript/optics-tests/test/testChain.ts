import { ethers } from 'hardhat';
const { BigNumber } = ethers;

import { Chain, Deploy } from '../../optics-deploy/src/chain';

export async function getTestChain(
  domain: number,
  updater: string,
  watchers: string[],
  recoveryManager?: string,
): Promise<Chain> {
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
  };
}

export async function getTestDeploy(
  domain: number,
  updater: string,
  watchers: string[],
  recoveryManager?: string,
): Promise<Deploy> {
  return {
    chain: await getTestChain(domain, updater, watchers, recoveryManager),
    contracts: { replicas: {} },
    verificationInput: [
      {
        name: 'string',
        address: 'Address',
        constructorArguments: ['arg'],
      },
    ],
    test: true,
  };
}

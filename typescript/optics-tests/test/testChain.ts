import { Chain, Deploy } from '../../optics-deploy/src/chain';
import { ethers } from 'hardhat';

const { BigNumber } = ethers;

export async function getTestChain(
  domain: number,
  updater: string,
  watchers: string[],
): Promise<Chain> {
  const [, , , , , , , deployer] = await ethers.getSigners();
  return {
    name: 'hh',
    provider: ethers.provider,
    deployer,
    domain,
    updater,
    optimisticSeconds: 5,
    watchers,
    gasPrice: BigNumber.from('20000000000'),
    confirmations: 0,
  };
}

export async function getTestDeploy(
  domain: number,
  updater: string,
  watcher: string[],
): Promise<Deploy> {
  return {
    chain: await getTestChain(domain, updater, watcher),
    contracts: { replicas: {} },
    test: true,
  };
}

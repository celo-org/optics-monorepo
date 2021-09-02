import { ethers } from 'hardhat';

import { getTestDeploy } from './testChain';
import { Updater } from '../lib/core';
import { Signer } from '../lib/types';
import { CoreDeploy as Deploy } from '../../optics-deploy/src/core/CoreDeploy';
import { deployTwoChains, deployNChains } from '../../optics-deploy/src/core';

const domains = [1000, 2000, 3000];

/*
 * Deploy the full Optics suite on two chains
 */
describe('DeployNChains', async () => {
  let signer: Signer,
    recoveryManager: Signer,
    updater: Updater;

  before(async () => {
    [signer, recoveryManager] = await ethers.getSigners();
    updater = await Updater.fromSigner(signer, domains[0]);
  });

  it('asserts all elements in three-chain deploy are correct', async () => {
    let deploys: Deploy[] = [];
    for (var i = 0; i < 3; i++) {
      deploys.push(await getTestDeploy(domains[i], updater.address, [recoveryManager.address]));
    }
    // deploy the entire Optics suite on 3 chains
    // will test inside deploy function
    await deployNChains(deploys);
  });

  it('asserts all elements in two-chain deploy are correct', async () => {
    let deploys: Deploy[] = [];
    for (var i = 0; i < 2; i++) {
      deploys.push(await getTestDeploy(domains[i], updater.address, [recoveryManager.address]));
    }

    // deploy entire Optics suite on 2 chains
    // will test inside deploy function
    await deployTwoChains(deploys[0], deploys[1]);
  })
});

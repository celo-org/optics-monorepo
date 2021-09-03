import { ethers } from 'hardhat';

import { getTestDeploy } from './testChain';
import { Updater } from '../lib/core';
import { Signer } from '../lib/types';
import { CoreDeploy as Deploy } from '../../optics-deploy/src/core/CoreDeploy';
import { deployTwoChains, deployNChains } from '../../optics-deploy/src/core';

const domains = [1000, 2000, 3000, 4000];

/*
 * Deploy the full Optics suite on two chains
 */
describe('deploy scripts', async () => {
  let signer: Signer,
    recoveryManager: Signer,
    updater: Updater;

  before(async () => {
    [signer, recoveryManager] = await ethers.getSigners();
    updater = await Updater.fromSigner(signer, domains[0]);
  });

  describe('deployTwoChains', async () => {
    it('2-chain deploy', async () => {
      let deploys: Deploy[] = [];
      for (var i = 0; i < 2; i++) {
        deploys.push(await getTestDeploy(domains[i], updater.address, [recoveryManager.address]));
      }

      // deploy optics contracts on 2 chains
      // will test inside deploy function
      await deployTwoChains(deploys[0], deploys[1]);
    });
  });

  describe('deployNChains', async () => {
    // tests deploys for up to 4 chains
    for (let i = 1; i <= 4; i++) {
      it(`${i}-chain deploy`, async () => {
        let deploys: Deploy[] = [];
        for (let j = 0; j < i; j++) {
          deploys.push(await getTestDeploy(domains[j], updater.address, [recoveryManager.address]));
        }
  
        // deploy optics contracts on `i` chains
        // will test inside deploy function
        await deployNChains(deploys);
      });
    }
  });
});

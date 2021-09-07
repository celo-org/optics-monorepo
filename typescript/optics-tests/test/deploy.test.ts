import { ethers } from 'hardhat';
import { expect } from 'chai';

import { getTestDeploy } from './testChain';
import { Updater } from '../lib/core';
import { Signer } from '../lib/types';
import { deployBridges } from '../../optics-deploy/src/bridge';
import { BridgeDeploy } from '../../optics-deploy/src/bridge/BridgeDeploy';
import { deployTwoChains, deployNChains } from '../../optics-deploy/src/core';
import { CoreDeploy } from '../../optics-deploy/src/core/CoreDeploy';
import { checkBridgeDeploy } from '../../optics-deploy/src/test/bridge';
import {
  MockWeth__factory,
} from '../../typechain/optics-xapps';

const domains = [1000, 2000, 3000, 4000];

/*
 * Deploy the full Optics suite on two chains
 */
describe('core deploy scripts', async () => {
  let signer: Signer,
    recoveryManager: Signer,
    updater: Updater;

  before(async () => {
    [signer, recoveryManager] = await ethers.getSigners();
    updater = await Updater.fromSigner(signer, domains[0]);
  });

  describe('deployTwoChains', async () => {
    it('2-chain deploy', async () => {
      let deploys: CoreDeploy[] = [];
      for (var i = 0; i < 2; i++) {
        deploys.push(await getTestDeploy(domains[i], updater.address, [recoveryManager.address]));
      }

      // deploy optics contracts on 2 chains
      // will test inside deploy function
      await deployTwoChains(deploys[0], deploys[1]);
      console.log(deploys)
    });
  });

  describe('deployNChains', async () => {
    // tests deploys for up to 4 chains
    for (let i = 1; i <= 4; i++) {
      it(`${i}-chain deploy`, async () => {
        let deploys: CoreDeploy[] = [];
        for (let j = 0; j < i; j++) {
          deploys.push(await getTestDeploy(domains[j], updater.address, [recoveryManager.address]));
        }

        // deploy optics contracts on `i` chains
        // will test inside deploy function
        await deployNChains(deploys);
      });
    }

    it(`asserts there is at least one deploy config`, async () => {
      const deploys: CoreDeploy[] = [];
      const errMsg = 'Must pass at least one deploy config'

      try {
        await deployNChains(deploys);
        // `deployNChains` should error and skip to catch block. If it didn't, we need to make it fail
        // here (same as `expect(true).to.be.false`, but more explicit)
        expect('no error').to.equal(errMsg);
      } catch(e) {
        // expect correct error message
        expect(e.message).to.equal(errMsg);
      }
    })
  });
});

describe.only('bridge deploy scripts', async () => {
  let deploys: CoreDeploy[],
    signer: Signer,
    recoveryManager: Signer,
    updater: Updater;

  before(async () => {
    [signer, recoveryManager] = await ethers.getSigners();
    updater = await Updater.fromSigner(signer, domains[0]);
  });

  beforeEach(async () => {
    deploys = [];
    for (let i = 0; i < 2; i++) {
      deploys.push(await getTestDeploy(domains[i], updater.address, [recoveryManager.address]));
    }
  });

  it('deploys bridge', async () => {
    const mockWeth = await new MockWeth__factory(signer).deploy();

    // must be set to find core contracts
    deploys[0].chain.config.name = 'alfajores';
    deploys[1].chain.config.name = 'kovan';

    const alfajoresDeploy = new BridgeDeploy(
      deploys[0].chain,
      {},
      '../../rust/config/1630513764971',
      true
    );
    const kovanDeploy = new BridgeDeploy(deploys[1].chain, { weth: mockWeth.address }, '../../rust/config/1630513764971', true);

    await deployBridges([alfajoresDeploy, kovanDeploy]);

    await checkBridgeDeploy(alfajoresDeploy, [2000]);
    await checkBridgeDeploy(kovanDeploy, [1000]);
  })
});

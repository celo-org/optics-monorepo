import { expect } from 'chai';
import ethers from 'ethers';

import { Signer } from '../lib/types';
import { Deploy } from '../../optics-deploy/src/chain';
import {
  deployUpdaterManager,
  deployUpgradeBeaconController,
} from '../../optics-deploy/src/deployOptics';
import * as contracts from '../../typechain/optics-core';

export const increaseTimestampBy = async (
  provider: ethers.providers.JsonRpcProvider,
  increaseTime: number,
) => {
  await provider.send('evm_increaseTime', [increaseTime]);
  await provider.send('evm_mine', []);
};

export type MysteryMathUpgrade = {
  proxy: contracts.MysteryMathV1 | contracts.MysteryMathV2;
  beacon: contracts.UpgradeBeacon;
  implementation: contracts.MysteryMathV1 | contracts.MysteryMathV2;
};

export class UpgradeTestHelpers {
  a: number = 5;
  b: number = 10;
  stateVar: number = 17;

  async deployMysteryMathUpgradeSetup(
    deploy: Deploy,
    signer: Signer,
    isNewDeploy?: boolean,
  ): Promise<MysteryMathUpgrade> {
    // deploy implementation
    const mysteryMathFactory = new contracts.MysteryMathV1__factory(signer);
    const mysteryMathImplementation = await mysteryMathFactory.deploy();

    if (isNewDeploy) {
      // deploy UpdaterManager
      await deployUpdaterManager(deploy);
      // deploy and set UpgradeBeaconController
      await deployUpgradeBeaconController(deploy);
    }

    // deploy and set upgrade beacon
    const beaconFactory = new contracts.UpgradeBeacon__factory(
      deploy.chain.deployer,
    );
    const beacon = await beaconFactory.deploy(
      mysteryMathImplementation.address,
      deploy.contracts.upgradeBeaconController!.address,
      { gasPrice: deploy.chain.gasPrice, gasLimit: 2_000_000 },
    );

    // deploy proxy
    let factory = new contracts.UpgradeBeaconProxy__factory(
      deploy.chain.deployer,
    );
    const upgradeBeaconProxy = await factory.deploy(beacon.address, [], {
      gasPrice: deploy.chain.gasPrice,
      gasLimit: 1_000_000,
    });

    // set proxy
    const proxy = mysteryMathFactory.attach(upgradeBeaconProxy.address);

    // Set state of proxy
    await proxy.setState(this.stateVar);

    return { proxy, beacon, implementation: mysteryMathImplementation };
  }

  async expectMysteryMathV1(mysteryMathProxy: contracts.MysteryMathV1) {
    const versionResult = await mysteryMathProxy.version();
    expect(versionResult).to.equal(1);

    const mathResult = await mysteryMathProxy.doMath(this.a, this.b);
    expect(mathResult).to.equal(this.a + this.b);

    const stateResult = await mysteryMathProxy.getState();
    expect(stateResult).to.equal(this.stateVar);
  }

  async expectMysteryMathV2(mysteryMathProxy: contracts.MysteryMathV2) {
    const versionResult = await mysteryMathProxy.version();
    expect(versionResult).to.equal(2);

    const mathResult = await mysteryMathProxy.doMath(this.a, this.b);
    expect(mathResult).to.equal(this.a * this.b);

    const stateResult = await mysteryMathProxy.getState();
    expect(stateResult).to.equal(this.stateVar);
  }
}

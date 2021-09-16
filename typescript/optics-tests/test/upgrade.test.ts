import { ethers } from 'hardhat';

import { getTestDeploy } from './testChain';
import { UpgradeTestHelpers, MysteryMathUpgrade } from './utils';
import { Signer } from '../lib/types';
import * as contracts from '@optics-xyz/ts-interface/dist/optics-core';

describe('Upgrade', async () => {
  const utils = new UpgradeTestHelpers();
  let signer: Signer,
    mysteryMath: MysteryMathUpgrade,
    upgradeBeaconController: contracts.UpgradeBeaconController;

  before(async () => {
    // set signer
    [signer] = await ethers.getSigners();

    // set up fresh test deploy
    const deploy = await getTestDeploy(1000, ethers.constants.AddressZero, []);

    // deploy upgrade setup for mysteryMath contract
    mysteryMath = await utils.deployMysteryMathUpgradeSetup(
      deploy,
      signer,
      true,
    );

    // set upgradeBeaconController
    upgradeBeaconController = deploy.contracts.upgradeBeaconController!;
  });

  it('Pre-Upgrade returns values from MysteryMathV1', async () => {
    await utils.expectMysteryMathV1(mysteryMath.proxy);
  });

  it('Upgrades without problem', async () => {
    // Deploy Implementation 2
    const factory = new contracts.MysteryMathV2__factory(signer);
    const implementation = await factory.deploy();

    // Upgrade to implementation 2
    await upgradeBeaconController.upgrade(
      mysteryMath.beacon.address,
      implementation.address,
    );
  });

  it('Post-Upgrade returns values from MysteryMathV2', async () => {
    await utils.expectMysteryMathV2(mysteryMath.proxy);
  });
});

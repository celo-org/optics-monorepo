import { expect } from 'chai';

import { Deploy } from '../../optics-deploy/src/chain';
import {
  deployUpdaterManager,
  deployUpgradeBeaconController,
} from '../../optics-deploy/src/deployOptics';
import * as contracts from '../../typechain/optics-core';

export const a = 5;
export const b = 10;
export const stateVar = 17;

export type MysteryMathUpgrade = {
  proxy: contracts.MysteryMathV1 | contracts.MysteryMathV2;
  beacon: contracts.UpgradeBeacon;
  implementation: contracts.MysteryMathV1 | contracts.MysteryMathV2;
};

export async function deployMysteryMathUpgradeSetup(
  deploy: Deploy,
  signer: any,
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
  await proxy.setState(stateVar);

  return { proxy, beacon, implementation: mysteryMathImplementation };
}

export async function expectMysteryMathV1(
  mysteryMathProxy: contracts.MysteryMathV1,
) {
  const versionResult = await mysteryMathProxy.version();
  expect(versionResult).to.equal(1);

  const mathResult = await mysteryMathProxy.doMath(a, b);
  expect(mathResult).to.equal(a + b);

  const stateResult = await mysteryMathProxy.getState();
  expect(stateResult).to.equal(stateVar);
}

export async function expectMysteryMathV2(
  mysteryMathProxy: contracts.MysteryMathV2,
) {
  const versionResult = await mysteryMathProxy.version();
  expect(versionResult).to.equal(2);

  const mathResult = await mysteryMathProxy.doMath(a, b);
  expect(mathResult).to.equal(a * b);

  const stateResult = await mysteryMathProxy.getState();
  expect(stateResult).to.equal(stateVar);
}

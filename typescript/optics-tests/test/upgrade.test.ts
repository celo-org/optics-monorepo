import { expect } from 'chai';
import { ethers } from 'hardhat';
import * as types from 'ethers';
import { getTestDeploy } from './testChain';
import * as deploys from '../../optics-deploy/src/deployOptics';
import * as contracts from '../../typechain/optics-core';

describe('Upgrade', async () => {
  let signer: types.Signer,
    proxy: contracts.MysteryMathV1,
    upgradeBeacon: contracts.UpgradeBeacon,
    upgradeBeaconController: contracts.UpgradeBeaconController;
  const a = 5;
  const b = 10;
  const stateVar = 17;

  async function deployProxy(): Promise<any> {
    // set up fresh test deploy
    const deploy = await getTestDeploy(1000, ethers.constants.AddressZero, []);

    // deploy implementation
    const mysteryMathFactory = new contracts.MysteryMathV1__factory(signer);
    const implementation = await mysteryMathFactory.deploy();

    // deploy UpdaterManager and UpgradeBeaconController
    await deploys.deployUpdaterManager(deploy);
    await deploys.deployUpgradeBeaconController(deploy);

    // deploy upgrade beacon
    const beaconFactory = new contracts.UpgradeBeacon__factory(
      deploy.chain.deployer,
    );
    const beacon = await beaconFactory.deploy(
      implementation.address,
      deploy.contracts.upgradeBeaconController!.address,
      { gasPrice: deploy.chain.gasPrice, gasLimit: 2_000_000 },
    );

    // deploy proxy
    let factory = new contracts.UpgradeBeaconProxy__factory(
      deploy.chain.deployer,
    );
    const proxy = await factory.deploy(beacon.address, []);

    return {
      upgradeBeacon: beacon,
      upgradeBeaconController: deploy.contracts.upgradeBeaconController,
      proxy: mysteryMathFactory.attach(proxy.address),
    };
  }

  before(async () => {
    // set signer
    [signer] = await ethers.getSigners();

    // SETUP CONTRACT SUITE
    const MysteryMathV1 = await deployProxy();

    proxy = MysteryMathV1.proxy;
    upgradeBeacon = MysteryMathV1.upgradeBeacon;
    upgradeBeaconController = MysteryMathV1.upgradeBeaconController;

    // Set state of proxy
    await proxy.setState(stateVar);
  });

  it('Pre-Upgrade returns version 1', async () => {
    const versionResult = await proxy.version();
    expect(versionResult).to.equal(1);
  });

  it('Pre-Upgrade returns the math from implementation v1', async () => {
    const mathResult = await proxy.doMath(a, b);
    expect(mathResult).to.equal(a + b);
  });

  it('Pre-Upgrade returns the expected state variable', async () => {
    const stateResult = await proxy.getState();
    expect(stateResult).to.equal(stateVar);
  });

  it('Upgrades without problem', async () => {
    // Deploy Implementation 2
    const factory = new contracts.MysteryMathV2__factory(signer);
    const implementation = await factory.deploy();

    // Upgrade to implementation 2
    await upgradeBeaconController.upgrade(
      upgradeBeacon.address,
      implementation.address,
    );
  });

  it('Post-Upgrade returns version 2', async () => {
    const versionResult = await proxy.version();
    expect(versionResult).to.equal(2);
  });

  it('Post-Upgrade returns the math from implementation v2', async () => {
    const mathResult = await proxy.doMath(a, b);
    expect(mathResult).to.equal(a * b);
  });

  it('Post-Upgrade preserved the state variable', async () => {
    const stateResult = await proxy.getState();
    expect(stateResult).to.equal(stateVar);
  });
});

import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Test } from 'mocha';
import * as ProxyUtils from '../../optics-deploy/src/proxyUtils';
import * as deploys from '../../optics-deploy/src/deployOptics';
import * as contracts from '../../typechain/optics-core';
import { getTestDeploy } from './testChain';
import { Updater } from '../lib';
// import { ethers } from 'ethers';

describe('Upgrade', async () => {
  let proxy: any,
    upgradeBeacon: contracts.UpgradeBeacon,
    upgradeBeaconController: contracts.UpgradeBeaconController;
  const a = 5;
  const b = 10;
  const stateVar = 17;

  async function deployProxy(): Promise<any> {
    let [signer] = await ethers.getSigners();
    const factory = new contracts.MysteryMathV1__factory(signer);
    // const implementation = await factory.deploy() as ethers.Contract;
    const implementation = await factory.deploy();

    let updater = await Updater.fromSigner(signer, 1000);
    const deploy = await getTestDeploy(1000, updater.address, []);
    await deploys.deployUpdaterManager(deploy);
    await deploys.deployUpgradeBeaconController(deploy);
    const beacon = await ProxyUtils._deployBeacon(deploy, implementation);
    const proxy = await ProxyUtils._deployProxy(deploy, beacon, []);
    await proxy.deployTransaction.wait(0);

    // proxy = factory.attach(proxy.address) as ethers.Contract;
    return {
      upgradeBeacon: beacon,
      upgradeBeaconController: deploy.contracts.upgradeBeaconController,
      proxy: factory.attach(proxy.address),
    };
  }

  before(async () => {
    // SETUP CONTRACT SUITE
    // const { contracts } = await optics.deployUpgradeSetupAndProxy(
    //   'MysteryMathV1',
    // );
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
    let [signer] = await ethers.getSigners();
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

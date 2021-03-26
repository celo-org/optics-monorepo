const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('Upgrade', async () => {
  let proxy,
    signer,
    proxyContract,
    upgradeBeacon,
    controller,
    implementation1,
    implementation2;
  const a = 5;
  const b = 10;
  const stateVar = 17;

  before(async () => {
    const signerArray = await ethers.getSigners();
    signer = signerArray[0];

    // SETUP CONTRACT SUITE

    // Deploy Implementation 1
    const MysteryMathV1 = await ethers.getContractFactory('MysteryMathV1');
    implementation1 = await MysteryMathV1.deploy();
    await implementation1.deployed();

    // Deploy Implementation 2
    const MysteryMathV2 = await ethers.getContractFactory('MysteryMathV2');
    implementation2 = await MysteryMathV2.deploy();
    await implementation2.deployed();

    // #later Deploy Controller
    controller = {
      address: signer.address,
    };

    // Deploy UpgradeBeacon
    const UpgradeBeacon = await ethers.getContractFactory('UpgradeBeacon');
    upgradeBeacon = await UpgradeBeacon.deploy(
      implementation1.address,
      controller.address,
    );
    await upgradeBeacon.deployed();

    // Deploy Proxy Contract (upgradeBeacon = UpgradeBeacon)
    const Proxy = await ethers.getContractFactory('UpgradeBeaconProxy');
    proxyContract = await Proxy.deploy(upgradeBeacon.address, '0x');
    await proxyContract.deployed();

    // instantiate proxy with Proxy Contract address + Implementation interface
    proxy = new ethers.Contract(
      proxyContract.address,
      MysteryMathV1.interface,
      signer,
    );

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
    const upgradeTransaction = {
      to: upgradeBeacon.address,
      data: ethers.utils.hexZeroPad(implementation2.address, 32),
    };

    await signer.sendTransaction(upgradeTransaction);
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

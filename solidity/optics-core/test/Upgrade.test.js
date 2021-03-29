const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('Upgrade', async () => {
  let proxy, signer, upgradeBeacon;
  const a = 5;
  const b = 10;
  const stateVar = 17;

  before(async () => {
    const signerArray = await ethers.getSigners();
    signer = signerArray[0];

    // SETUP CONTRACT SUITE
    const { contracts } = await optics.deployProxyWithImplementation(
      'MysteryMathV1',
    );

    proxy = contracts.proxyWithImplementation;
    upgradeBeacon = contracts.upgradeBeacon;

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
    await optics.upgradeToImplementation(
      upgradeBeacon,
      signer,
      'MysteryMathV2',
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

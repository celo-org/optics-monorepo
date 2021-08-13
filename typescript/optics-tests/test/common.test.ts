import { ethers } from 'hardhat';
import { expect } from 'chai';

import { TestCommon__factory, TestCommon } from '../../typechain/optics-core';
import { OpticsState, Updater } from '../lib/core';
import { Signer } from '../lib/types';
import signedUpdateTestCases from '../../../vectors/signedUpdate.json';

const localDomain = 1000;

describe('Common', async () => {
  let signer: Signer,
    fakeSigner: Signer,
    common: TestCommon,
    updater: Updater,
    fakeUpdater: Updater;

  before(async () => {
    [signer, fakeSigner] = await ethers.getSigners();
    updater = await Updater.fromSigner(signer, localDomain);
    fakeUpdater = await Updater.fromSigner(fakeSigner, localDomain);
  });

  beforeEach(async () => {
    const commonFactory = new TestCommon__factory(signer);
    common = await commonFactory.deploy(localDomain, updater.address);
  });

  it('Accepts updater signature', async () => {
    const oldRoot = ethers.utils.formatBytes32String('old root');
    const newRoot = ethers.utils.formatBytes32String('new root');

    const { signature } = await updater.signUpdate(oldRoot, newRoot);
    const isValid = await common.testIsUpdaterSignature(
      oldRoot,
      newRoot,
      signature,
    );
    expect(isValid).to.be.true;
  });

  it('Rejects non-updater signature', async () => {
    const oldRoot = ethers.utils.formatBytes32String('old root');
    const newRoot = ethers.utils.formatBytes32String('new root');

    const { signature: fakeSignature } = await fakeUpdater.signUpdate(
      oldRoot,
      newRoot,
    );
    expect(await common.testIsUpdaterSignature(oldRoot, newRoot, fakeSignature))
      .to.be.false;
  });

  it('Fails on valid double update proof', async () => {
    const oldRoot = ethers.utils.formatBytes32String('old root');
    const newRoot = ethers.utils.formatBytes32String('new root 1');
    const newRoot2 = ethers.utils.formatBytes32String('new root 2');

    const { signature } = await updater.signUpdate(oldRoot, newRoot);
    const { signature: signature2 } = await updater.signUpdate(
      oldRoot,
      newRoot2,
    );

    await expect(
      common.doubleUpdate(oldRoot, [newRoot, newRoot2], signature, signature2),
    ).to.emit(common, 'DoubleUpdate');

    expect(await common.state()).to.equal(OpticsState.FAILED);
  });

  it('Does not fail contract on invalid double update proof', async () => {
    const oldRoot = ethers.utils.formatBytes32String('old root');
    const newRoot = ethers.utils.formatBytes32String('new root');

    const { signature } = await updater.signUpdate(oldRoot, newRoot);

    // Double update proof uses same roots and signatures
    await common.doubleUpdate(
      oldRoot,
      [newRoot, newRoot],
      signature,
      signature,
    );

    // State should not be failed because double update proof does not
    // demonstrate fraud
    const state = await common.state();
    expect(state).not.to.equal(OpticsState.FAILED);
    expect(state).to.equal(OpticsState.ACTIVE);
  });

  it('Checks Rust-produced SignedUpdate', async () => {
    // Compare Rust output in json file to solidity output
    for (let testCase of signedUpdateTestCases) {
      const { oldRoot, newRoot, signature, signer } = testCase;

      const signerAddress = ethers.utils.getAddress(signer);
      await common.setUpdater(signerAddress);

      expect(
        await common.testIsUpdaterSignature(
          oldRoot,
          newRoot,
          ethers.utils.joinSignature(signature),
        ),
      ).to.be.true;
    }
  });
});

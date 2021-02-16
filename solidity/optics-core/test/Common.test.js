const { waffle, ethers } = require('hardhat');
const { provider, deployMockContract } = waffle;
const { expect } = require('chai');

const { testCases } = require('../../vectors/domainHashTestCases.json');

const originDomain = 1000;
const ownDomain = 2000;

describe('Common', async () => {
  let common, signer, fakeSigner, updater, fakeUpdater, initialRoot;

  before(async () => {
    [signer, fakeSigner] = provider.getWallets();
    updater = await optics.Updater.fromSigner(signer, originDomain);
    fakeUpdater = await optics.Updater.fromSigner(fakeSigner, originDomain);
    initialRoot = ethers.utils.formatBytes32String('initial root');
  });

  beforeEach(async () => {
    const CommonFactory = await ethers.getContractFactory('TestCommon');
    common = await CommonFactory.deploy(
      originDomain,
      updater.signer.address,
      initialRoot,
    );
    await common.deployed();
  });

  it('Accepts updater signature', async () => {
    const oldRoot = ethers.utils.formatBytes32String('old root');
    const newRoot = ethers.utils.formatBytes32String('new root');

    const { signature } = await updater.signUpdate(oldRoot, newRoot);
    expect(await common.testCheckSig(oldRoot, newRoot, signature)).to.be.true;
  });

  it('Rejects non-updater signature', async () => {
    const oldRoot = ethers.utils.formatBytes32String('old root');
    const newRoot = ethers.utils.formatBytes32String('new root');

    const { signature: fakeSignature } = await fakeUpdater.signUpdate(
      oldRoot,
      newRoot,
    );
    expect(await common.testCheckSig(oldRoot, newRoot, fakeSignature)).to.be
      .false;
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

    expect(await common.state()).to.equal(optics.State.FAILED);
  });

  it('Calculates domain hashes from originDomain', async () => {
    // Compare Rust output in json file to solidity output
    for (let testCase of testCases) {
      const { originDomain, expectedDomainHash } = testCase;
      const solidityDomainHash = await common.testDomainHash(originDomain);
      expect(solidityDomainHash).to.equal(expectedDomainHash);
    }
  });
});

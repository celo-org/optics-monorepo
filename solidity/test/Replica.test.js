const { waffle, ethers } = require('hardhat');
const { provider, deployMockContract } = waffle;
const { expect } = require('chai');

const ACTIVE = 0;
const FAILED = 1;
const originSLIP44 = 1000;
const ownSLIP44 = 2000;
const optimisticSeconds = 3;
const initialCurrentRoot = ethers.utils.formatBytes32String('current');
const initialLastProcessed = 0;

describe('Replica', async () => {
  let replica, homeSigner, processor, updater;

  before(async () => {
    [homeSigner, processor] = provider.getWallets();
    updater = await optics.Updater.fromSigner(homeSigner, originSLIP44);
  });

  beforeEach(async () => {
    const Replica = await ethers.getContractFactory('TestReplica');
    replica = await Replica.deploy(
      originSLIP44,
      ownSLIP44,
      updater.signer.address,
      optimisticSeconds,
      initialCurrentRoot,
      initialLastProcessed,
    );
    await replica.deployed();
  });

  it('Returns the next pending update', async () => {
    const currentRoot = await replica.current();
    const newRoot = ethers.utils.formatBytes32String('new root');
    const { signature } = await updater.signUpdate(currentRoot, newRoot);

    const timestamp = await replica.timestamp();
    await replica.update(currentRoot, newRoot, signature);
    const [pending, confirmAt] = await replica.nextPending();

    // TODO: timestamps incomparable
    expect(pending).to.equal(newRoot);
  });
});

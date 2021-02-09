const { waffle, ethers } = require('hardhat');
const { provider, deployMockContract } = waffle;
const { expect } = require('chai');
const NoSortition = require('../artifacts/contracts/Sortition.sol/NoSortition.json');

const originSLIP44 = 1234;

describe('Home', async () => {
  let home, signer, fakeSigner, updater, fakeUpdater;

  // Helper function that enqueues message and returns its root
  const enqueueMessageAndGetRoot = async (message, recipient) => {
    message = ethers.utils.formatBytes32String(message);
    recipient = ethers.utils.formatBytes32String(recipient);
    await home.enqueue(originSLIP44, recipient, message);
    const [_currentRoot, latestRoot] = await home.suggestUpdate();
    return latestRoot;
  };

  before(async () => {
    [signer, fakeSigner] = provider.getWallets();
    updater = await optics.Updater.fromSigner(signer, originSLIP44);
    fakeUpdater = await optics.Updater.fromSigner(fakeSigner, originSLIP44);
  });

  beforeEach(async () => {
    const mockSortition = await deployMockContract(signer, NoSortition.abi);
    await mockSortition.mock.current.returns(signer.address);
    await mockSortition.mock.slash.returns();

    const Home = await ethers.getContractFactory('TestHome');
    home = await Home.deploy(originSLIP44, mockSortition.address);
    await home.deployed();
  });

  it('Halts on fail', async () => {
    await home.setFailed();
    expect(await home.state()).to.equal(optics.State.FAILED);

    const recipient = ethers.utils.formatBytes32String('recipient');
    const message = ethers.utils.formatBytes32String('message');
    await expect(
      home.enqueue(originSLIP44, recipient, message),
    ).to.be.revertedWith('failed state');
  });

  it('Suggests current root and latest root on suggestUpdate', async () => {
    const currentRoot = await home.current();

    const recipient = ethers.utils.formatBytes32String('recipient');
    const message = ethers.utils.formatBytes32String('message');
    await home.enqueue(originSLIP44, recipient, message);
    const latestEnqueuedRoot = await home.queueEnd();

    const [suggestedCurrent, suggestedNew] = await home.suggestUpdate();
    expect(suggestedCurrent).to.equal(currentRoot);
    expect(suggestedNew).to.equal(latestEnqueuedRoot);
  });

  it('Accepts a valid update', async () => {
    const currentRoot = await home.current();
    const newRoot = await enqueueMessageAndGetRoot('message', 'recipient');

    const { signature } = await updater.signUpdate(currentRoot, newRoot);
    await expect(home.update(currentRoot, newRoot, signature))
      .to.emit(home, 'Update')
      .withArgs(originSLIP44, currentRoot, newRoot, signature);

    expect(await home.current()).to.equal(newRoot);
  });

  it('Rejects update that does not build off of current root', async () => {
    // First root is current root
    const secondRoot = await enqueueMessageAndGetRoot('message', 'recipient');
    const thirdRoot = await enqueueMessageAndGetRoot('message2', 'recipient2');

    // Try to submit update that skips the current (first) root
    const { signature } = await updater.signUpdate(secondRoot, thirdRoot);
    await expect(
      home.update(secondRoot, thirdRoot, signature),
    ).to.be.revertedWith('not a current update');
  });

  it('Rejects update that does not exist in queue', async () => {
    const currentRoot = await home.current();
    const fakeNewRoot = ethers.utils.formatBytes32String('fake root');

    const { signature } = await updater.signUpdate(currentRoot, fakeNewRoot);
    await expect(home.update(currentRoot, fakeNewRoot, signature)).to.emit(
      home,
      'ImproperUpdate',
    );

    expect(await home.state()).to.equal(optics.State.FAILED);
  });

  it('Rejects update from non-updater address', async () => {
    const currentRoot = await home.current();
    const newRoot = await enqueueMessageAndGetRoot('message', 'recipient');

    const { signature: fakeSignature } = await fakeUpdater.signUpdate(
      currentRoot,
      newRoot,
    );
    await expect(
      home.update(currentRoot, newRoot, fakeSignature),
    ).to.be.revertedWith('bad sig');
  });

  it('Fails on valid double update proof', async () => {
    const firstRoot = await home.current();
    const secondRoot = await enqueueMessageAndGetRoot('message', 'recipient');
    const thirdRoot = await enqueueMessageAndGetRoot('message2', 'recipient2');

    const { signature } = await updater.signUpdate(firstRoot, secondRoot);
    const { signature: signature2 } = await updater.signUpdate(
      firstRoot,
      thirdRoot,
    );

    await expect(
      home.doubleUpdate(
        firstRoot,
        [secondRoot, thirdRoot],
        signature,
        signature2,
      ),
    ).to.emit(home, 'DoubleUpdate');

    expect(await home.state()).to.equal(optics.State.FAILED);
  });
});

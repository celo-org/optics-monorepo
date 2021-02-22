const { waffle, ethers } = require('hardhat');
const { provider, deployMockContract } = waffle;
const { expect } = require('chai');
const NoSortition = require('../artifacts/contracts/Sortition.sol/NoSortition.json');

const originDomain = 1000;
const destDomain = 2000;

describe('Home', async () => {
  let home, signer, fakeSigner, updater, fakeUpdater, recipient;

  // Helper function that enqueues message and returns its root.
  // The message recipient is the same for all messages enqueued.
  const enqueueMessageAndGetRoot = async (message) => {
    message = ethers.utils.formatBytes32String(message);
    await home.enqueue(
      destDomain,
      optics.ethersAddressToBytes32(recipient.address),
      message,
    );
    const [_currentRoot, latestRoot] = await home.suggestUpdate();
    return latestRoot;
  };

  before(async () => {
    [signer, fakeSigner, recipient] = provider.getWallets();
    updater = await optics.Updater.fromSigner(signer, originDomain);
    fakeUpdater = await optics.Updater.fromSigner(fakeSigner, originDomain);
  });

  beforeEach(async () => {
    const mockSortition = await deployMockContract(signer, NoSortition.abi);
    await mockSortition.mock.current.returns(signer.address);
    await mockSortition.mock.slash.returns();

    const Home = await ethers.getContractFactory('TestHome');
    home = await Home.deploy(originDomain, mockSortition.address);
    await home.deployed();
  });

  it('Halts on fail', async () => {
    await home.setFailed();
    expect(await home.state()).to.equal(optics.State.FAILED);

    const message = ethers.utils.formatBytes32String('message');
    await expect(
      home.enqueue(
        destDomain,
        optics.ethersAddressToBytes32(recipient.address),
        message,
      ),
    ).to.be.revertedWith('failed state');
  });

  it('Enqueues a message', async () => {
    const message = ethers.utils.formatBytes32String('message');
    const sequence = (await home.sequences(originDomain)) + 1;

    // Format data that will be emitted from Dispatch event
    const destinationAndSequence = optics.calcDestinationAndSequence(
      destDomain,
      sequence,
    );
    const formattedMessage = optics.formatMessage(
      originDomain,
      signer.address,
      sequence,
      destDomain,
      recipient.address,
      message,
    );
    const leaf = optics.messageToLeaf(formattedMessage);
    const leafIndex = await home.nextLeafIndex();

    // Send message with signer address as msg.sender
    await expect(
      home
        .connect(signer)
        .enqueue(
          destDomain,
          optics.ethersAddressToBytes32(recipient.address),
          message,
        ),
    )
      .to.emit(home, 'Dispatch')
      .withArgs(destinationAndSequence, leafIndex, leaf, formattedMessage);
  });

  it('Suggests current root and latest root on suggestUpdate', async () => {
    const currentRoot = await home.current();

    const message = ethers.utils.formatBytes32String('message');
    await home.enqueue(
      destDomain,
      optics.ethersAddressToBytes32(recipient.address),
      message,
    );
    const latestEnqueuedRoot = await home.queueEnd();

    const [suggestedCurrent, suggestedNew] = await home.suggestUpdate();
    expect(suggestedCurrent).to.equal(currentRoot);
    expect(suggestedNew).to.equal(latestEnqueuedRoot);
  });

  it('Accepts a valid update', async () => {
    const currentRoot = await home.current();
    const newRoot = await enqueueMessageAndGetRoot('message');

    const { signature } = await updater.signUpdate(currentRoot, newRoot);
    await expect(home.update(currentRoot, newRoot, signature))
      .to.emit(home, 'Update')
      .withArgs(originDomain, currentRoot, newRoot, signature);

    expect(await home.current()).to.equal(newRoot);
  });

  it('Rejects update that does not build off of current root', async () => {
    // First root is current root
    const secondRoot = await enqueueMessageAndGetRoot('message');
    const thirdRoot = await enqueueMessageAndGetRoot('message2');

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
    const newRoot = await enqueueMessageAndGetRoot('message');

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
    const secondRoot = await enqueueMessageAndGetRoot('message');
    const thirdRoot = await enqueueMessageAndGetRoot('message2');

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

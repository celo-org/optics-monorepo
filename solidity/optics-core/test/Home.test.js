const { waffle, ethers } = require('hardhat');
const { provider, deployMockContract } = waffle;
const { expect } = require('chai');
const UpdaterManager = require('../artifacts/contracts/UpdaterManager.sol/UpdaterManager.json');

const {
  testCases: signatureDomainTestCases,
} = require('../../../vectors/signatureDomainTestCases.json');
const {
  testCases,
} = require('../../../vectors/destinationSequenceTestCases.json');

const localDomain = 1000;
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
    const [, latestRoot] = await home.suggestUpdate();
    return latestRoot;
  };

  before(async () => {
    [signer, fakeSigner, recipient] = provider.getWallets();
    updater = await optics.Updater.fromSigner(signer, localDomain);
    fakeUpdater = await optics.Updater.fromSigner(fakeSigner, localDomain);
  });

  beforeEach(async () => {
    const mockUpdaterManager = await deployMockContract(
      signer,
      UpdaterManager.abi,
    );
    await mockUpdaterManager.mock.updater.returns(signer.address);
    await mockUpdaterManager.mock.slashUpdater.returns();

    const { contracts } = await optics.deployUpgradeSetupAndProxy(
      'TestHome',
      [localDomain],
      [mockUpdaterManager.address],
    );

    home = contracts.proxyWithImplementation;
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

  it('Calculates signatureDomain from localDomain', async () => {
    const mockUpdaterManager = await deployMockContract(
      signer,
      UpdaterManager.abi,
    );
    await mockUpdaterManager.mock.updater.returns(signer.address);
    await mockUpdaterManager.mock.slashUpdater.returns();

    // Compare Rust output in json file to solidity output
    for (let testCase of signatureDomainTestCases) {
      const { domain: localDomain, expectedSignatureDomain } = testCase;

      const { contracts } = await optics.deployUpgradeSetupAndProxy(
        'TestHome',
        [localDomain],
        [mockUpdaterManager.address],
      );
      const home = contracts.proxyWithImplementation;

      const signatureDomain = await home.testSignatureDomain();
      expect(signatureDomain).to.equal(expectedSignatureDomain);
    }
  });

  it('Enqueues a message', async () => {
    const message = ethers.utils.formatBytes32String('message');
    const sequence = (await home.sequences(localDomain)) + 1;

    // Format data that will be emitted from Dispatch event
    const destinationAndSequence = optics.destinationAndSequence(
      destDomain,
      sequence,
    );

    const formattedMessage = optics.formatMessage(
      localDomain,
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
      .withArgs(leafIndex, destinationAndSequence, leaf, formattedMessage);
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

  it('Suggests empty update values when queue is empty', async () => {
    const length = await home.queueLength();
    expect(length).to.equal(0);

    const [suggestedCurrent, suggestedNew] = await home.suggestUpdate();
    expect(suggestedCurrent).to.equal(ethers.utils.formatBytes32String(0));
    expect(suggestedNew).to.equal(ethers.utils.formatBytes32String(0));
  });

  it('Accepts a valid update', async () => {
    const currentRoot = await home.current();
    const newRoot = await enqueueMessageAndGetRoot('message');

    const { signature } = await updater.signUpdate(currentRoot, newRoot);
    await expect(home.update(currentRoot, newRoot, signature))
      .to.emit(home, 'Update')
      .withArgs(localDomain, currentRoot, newRoot, signature);

    expect(await home.current()).to.equal(newRoot);
    expect(await home.queueContains(newRoot)).to.be.false;
  });

  it('Batch-accepts several updates', async () => {
    const currentRoot = await home.current();
    const newRoot1 = await enqueueMessageAndGetRoot('message1');
    const newRoot2 = await enqueueMessageAndGetRoot('message2');
    const newRoot3 = await enqueueMessageAndGetRoot('message3');

    const { signature } = await updater.signUpdate(currentRoot, newRoot3);
    await expect(home.update(currentRoot, newRoot3, signature))
      .to.emit(home, 'Update')
      .withArgs(localDomain, currentRoot, newRoot3, signature);

    expect(await home.current()).to.equal(newRoot3);
    expect(await home.queueContains(newRoot1)).to.be.false;
    expect(await home.queueContains(newRoot2)).to.be.false;
    expect(await home.queueContains(newRoot3)).to.be.false;
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

  it('Correctly calculates destinationAndSequence', async () => {
    for (let testCase of testCases) {
      let { destination, sequence, expectedDestinationAndSequence } = testCase;

      const solidityDestinationAndSequence = await home.testDestinationAndSequence(
        destination,
        sequence,
      );

      expect(solidityDestinationAndSequence).to.equal(
        expectedDestinationAndSequence,
      );
    }
  });
});

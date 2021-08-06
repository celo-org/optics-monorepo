import { ethers, optics } from 'hardhat';
import { expect } from 'chai';
import { getTestDeploy } from './testChain';
import { OpticsState, Updater } from '../lib';
import { Signer } from '../lib/types';
import { CoreDeploy as Deploy } from '../../optics-deploy/src/core/CoreDeploy';
import * as deploys from '../../optics-deploy/src/core';

import {
  TestHome,
  UpdaterManager__factory,
  UpdaterManager,
} from '../../typechain/optics-core';

import homeDomainHashTestCases from '../../../vectors/homeDomainHash.json';
import destinationSequenceTestCases from '../../../vectors/destinationSequence.json';

const localDomain = 1000;
const destDomain = 2000;
const emptyAddress: string = '0x' + '00'.repeat(32);

describe('Home', async () => {
  let deploy: Deploy,
    home: TestHome,
    signer: Signer,
    fakeSigner: Signer,
    recipient: Signer,
    updater: Updater,
    fakeUpdater: Updater,
    fakeUpdaterManager: UpdaterManager;

  // Helper function that enqueues message and returns its root.
  // The message recipient is the same for all messages enqueued.
  const enqueueMessageAndGetRoot = async (message: string) => {
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
    [signer, fakeSigner, recipient] = await ethers.getSigners();
    updater = await Updater.fromSigner(signer, localDomain);

    deploy = await getTestDeploy(localDomain, updater.address, []);

    await deploys.deployUpdaterManager(deploy);
    await deploys.deployUpgradeBeaconController(deploy);

    fakeUpdater = await Updater.fromSigner(fakeSigner, localDomain);

    // deploy fake UpdaterManager
    const updaterManagerFactory = new UpdaterManager__factory(signer);
    fakeUpdaterManager = await updaterManagerFactory.deploy(updater.address);

    const ret = await fakeUpdaterManager.updater();
    expect(ret).to.equal(signer.address);
  });

  beforeEach(async () => {
    // redeploy the home before each test run
    await deploys.deployHome(deploy);
    home = deploy.contracts.home?.proxy as TestHome;

    // set home on UpdaterManager
    await deploy.contracts.updaterManager!.setHome(home.address);
  });

  it('Cannot be initialized twice', async () => {
    await expect(
      home.initialize(fakeUpdaterManager.address),
    ).to.be.revertedWith('Initializable: contract is already initialized');
  });

  it('Halts on fail', async () => {
    await home.setFailed();
    expect(await home.state()).to.equal(OpticsState.FAILED);

    const message = ethers.utils.formatBytes32String('message');
    await expect(
      home.enqueue(
        destDomain,
        optics.ethersAddressToBytes32(recipient.address),
        message,
      ),
    ).to.be.revertedWith('failed state');
  });

  it('Calculated domain hash matches Rust-produced domain hash', async () => {
    // Compare Rust output in json file to solidity output (json file matches
    // hash for local domain of 1000)
    for (let testCase of homeDomainHashTestCases) {
      let deploy = await getTestDeploy(
        testCase.homeDomain,
        fakeUpdaterManager.address,
        [],
      );
      await deploys.deployUpdaterManager(deploy);
      await deploys.deployUpgradeBeaconController(deploy);
      await deploys.deployHome(deploy);

      const tempHome = deploy.contracts.home?.proxy! as TestHome;
      const { expectedDomainHash } = testCase;
      const homeDomainHash = await tempHome.testHomeDomainHash();
      expect(homeDomainHash).to.equal(expectedDomainHash);
    }
  });

  it('Does not enqueue large messages', async () => {
    const message = `0x${Buffer.alloc(3000).toString('hex')}`;
    await expect(
      home
        .connect(signer)
        .enqueue(
          destDomain,
          optics.ethersAddressToBytes32(recipient.address),
          message,
        ),
    ).to.be.revertedWith('!too big');
  });

  it('Enqueues a message', async () => {
    const message = ethers.utils.formatBytes32String('message');
    const sequence = await home.sequences(localDomain);

    // Format data that will be emitted from Dispatch event
    const destinationAndSequence = optics.destinationAndSequence(
      destDomain,
      sequence,
    );

    const opticsMessage = optics.formatMessage(
      localDomain,
      signer.address,
      sequence,
      destDomain,
      recipient.address,
      message,
    );
    const leaf = optics.messageToLeaf(opticsMessage);
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
      .withArgs(leafIndex, destinationAndSequence, leaf, opticsMessage);
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
    expect(suggestedCurrent).to.equal(emptyAddress);
    expect(suggestedNew).to.equal(emptyAddress);
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
    expect(await home.state()).to.equal(OpticsState.FAILED);
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
    expect(await home.state()).to.equal(OpticsState.FAILED);
  });

  it('Correctly calculates destinationAndSequence', async () => {
    for (let testCase of destinationSequenceTestCases) {
      let { destination, sequence, expectedDestinationAndSequence } = testCase;
      const solidityDestinationAndSequence =
        await home.testDestinationAndSequence(destination, sequence);
      expect(solidityDestinationAndSequence).to.equal(
        expectedDestinationAndSequence,
      );
    }
  });
});

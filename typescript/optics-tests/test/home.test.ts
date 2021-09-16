import { ethers, optics } from 'hardhat';
import { expect } from 'chai';
import { getTestDeploy } from './testChain';
import { OpticsState, Updater } from '../lib/core';
import { Signer } from '../lib/types';
import { CoreDeploy as Deploy } from '@optics-xyz/deploy/dist/src/core/CoreDeploy';
import * as deploys from '@optics-xyz/deploy/dist/src/core';

import {
  TestHome,
  UpdaterManager__factory,
  UpdaterManager,
} from '@optics-xyz/ts-interface/dist/optics-core';

const homeDomainHashTestCases = require('../../../vectors/homeDomainHash.json');
const destinationNonceTestCases = require('../../../vectors/destinationNonce.json');

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

  // Helper function that dispatches message and returns intermediate root.
  // The message recipient is the same for all messages dispatched.
  const dispatchMessageAndGetRoot = async (message: string) => {
    message = ethers.utils.formatBytes32String(message);
    await home.dispatch(
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
      home.dispatch(
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

  it('Does not dispatch too large messages', async () => {
    const message = `0x${Buffer.alloc(3000).toString('hex')}`;
    await expect(
      home
        .connect(signer)
        .dispatch(
          destDomain,
          optics.ethersAddressToBytes32(recipient.address),
          message,
        ),
    ).to.be.revertedWith('msg too long');
  });

  it('Dispatches a message', async () => {
    const message = ethers.utils.formatBytes32String('message');
    const nonce = await home.nonces(localDomain);

    // Format data that will be emitted from Dispatch event
    const destinationAndNonce = optics.destinationAndNonce(destDomain, nonce);

    const opticsMessage = optics.formatMessage(
      localDomain,
      signer.address,
      nonce,
      destDomain,
      recipient.address,
      message,
    );
    const messageHash = optics.messageHash(opticsMessage);
    const leafIndex = await home.nextLeafIndex();
    const committedRoot = await home.committedRoot();

    // Send message with signer address as msg.sender
    await expect(
      home
        .connect(signer)
        .dispatch(
          destDomain,
          optics.ethersAddressToBytes32(recipient.address),
          message,
        ),
    )
      .to.emit(home, 'Dispatch')
      .withArgs(
        messageHash,
        leafIndex,
        destinationAndNonce,
        committedRoot,
        opticsMessage,
      );
  });

  it('Suggests current root and latest root on suggestUpdate', async () => {
    const committedRoot = await home.committedRoot();
    const message = ethers.utils.formatBytes32String('message');
    await home.dispatch(
      destDomain,
      optics.ethersAddressToBytes32(recipient.address),
      message,
    );
    const latestEnqueuedRoot = await home.queueEnd();
    const [suggestedCommitted, suggestedNew] = await home.suggestUpdate();
    expect(suggestedCommitted).to.equal(committedRoot);
    expect(suggestedNew).to.equal(latestEnqueuedRoot);
  });

  it('Suggests empty update values when queue is empty', async () => {
    const length = await home.queueLength();
    expect(length).to.equal(0);

    const [suggestedCommitted, suggestedNew] = await home.suggestUpdate();
    expect(suggestedCommitted).to.equal(emptyAddress);
    expect(suggestedNew).to.equal(emptyAddress);
  });

  it('Accepts a valid update', async () => {
    const committedRoot = await home.committedRoot();
    const newRoot = await dispatchMessageAndGetRoot('message');
    const { signature } = await updater.signUpdate(committedRoot, newRoot);

    await expect(home.update(committedRoot, newRoot, signature))
      .to.emit(home, 'Update')
      .withArgs(localDomain, committedRoot, newRoot, signature);
    expect(await home.committedRoot()).to.equal(newRoot);
    expect(await home.queueContains(newRoot)).to.be.false;
  });

  it('Batch-accepts several updates', async () => {
    const committedRoot = await home.committedRoot();
    const newRoot1 = await dispatchMessageAndGetRoot('message1');
    const newRoot2 = await dispatchMessageAndGetRoot('message2');
    const newRoot3 = await dispatchMessageAndGetRoot('message3');
    const { signature } = await updater.signUpdate(committedRoot, newRoot3);

    await expect(home.update(committedRoot, newRoot3, signature))
      .to.emit(home, 'Update')
      .withArgs(localDomain, committedRoot, newRoot3, signature);
    expect(await home.committedRoot()).to.equal(newRoot3);
    expect(await home.queueContains(newRoot1)).to.be.false;
    expect(await home.queueContains(newRoot2)).to.be.false;
    expect(await home.queueContains(newRoot3)).to.be.false;
  });

  it('Rejects update that does not build off of current root', async () => {
    // First root is committedRoot
    const secondRoot = await dispatchMessageAndGetRoot('message');
    const thirdRoot = await dispatchMessageAndGetRoot('message2');

    // Try to submit update that skips the current (first) root
    const { signature } = await updater.signUpdate(secondRoot, thirdRoot);
    await expect(
      home.update(secondRoot, thirdRoot, signature),
    ).to.be.revertedWith('not a current update');
  });

  it('Rejects update that does not exist in queue', async () => {
    const committedRoot = await home.committedRoot();
    const fakeNewRoot = ethers.utils.formatBytes32String('fake root');
    const { signature } = await updater.signUpdate(committedRoot, fakeNewRoot);

    await expect(home.update(committedRoot, fakeNewRoot, signature)).to.emit(
      home,
      'ImproperUpdate',
    );
    expect(await home.state()).to.equal(OpticsState.FAILED);
  });

  it('Rejects update from non-updater address', async () => {
    const committedRoot = await home.committedRoot();
    const newRoot = await dispatchMessageAndGetRoot('message');
    const { signature: fakeSignature } = await fakeUpdater.signUpdate(
      committedRoot,
      newRoot,
    );
    await expect(
      home.update(committedRoot, newRoot, fakeSignature),
    ).to.be.revertedWith('!updater sig');
  });

  it('Fails on valid double update proof', async () => {
    const firstRoot = await home.committedRoot();
    const secondRoot = await dispatchMessageAndGetRoot('message');
    const thirdRoot = await dispatchMessageAndGetRoot('message2');
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

  it('Correctly calculates destinationAndNonce', async () => {
    for (let testCase of destinationNonceTestCases) {
      let { destination, nonce, expectedDestinationAndNonce } = testCase;
      const solidityDestinationAndNonce = await home.testDestinationAndNonce(
        destination,
        nonce,
      );
      expect(solidityDestinationAndNonce).to.equal(expectedDestinationAndNonce);
    }
  });
});

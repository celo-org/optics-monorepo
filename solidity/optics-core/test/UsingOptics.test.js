const { waffle, ethers } = require('hardhat');
const { provider } = waffle;
const { expect } = require('chai');

const {
  testCases: signedFailureTestCases,
} = require('../../../vectors/signedFailureTestCases.json');

const originDomain = 1000;
const ownDomain = 2000;
const optimisticSeconds = 3;
const initialCurrentRoot = ethers.utils.formatBytes32String('current');
const initialLastProcessed = 0;

describe('UsingOptics', async () => {
  let usingOptics, replica, signer, updater;

  before(async () => {
    [signer] = provider.getWallets();
    updater = await optics.Updater.fromSigner(signer, originDomain);
  });

  beforeEach(async () => {
    const UsingOptics = await ethers.getContractFactory('TestUsingOptics');
    usingOptics = await UsingOptics.deploy();
    await usingOptics.deployed();

    const controller = null;
    const { contracts } = await optics.deployUpgradeSetupAndProxy(
      'TestReplica',
      [originDomain],
      [
        ownDomain,
        updater.signer.address,
        initialCurrentRoot,
        optimisticSeconds,
        initialLastProcessed,
      ],
      controller,
      'initialize(uint32, address, bytes32, uint256, uint256)',
    );

    replica = contracts.proxyWithImplementation;
  });

  it('Checks Rust-produced SignedFailureNotification', async () => {
    // Compare Rust output in json file to solidity output
    const testCase = signedFailureTestCases[0];
    const { domain, updater, signature, signer } = testCase;

    await replica.setUpdater(updater);
    await usingOptics.ownerEnrollReplica(replica.address, domain);
    await usingOptics.setWatcherPermission(signer, domain, true);

    const watcher = await usingOptics.testRecoverWatcherFromSig(
      domain,
      replica.address,
      updater,
      ethers.utils.joinSignature(signature),
    );

    expect(watcher.toLowerCase()).to.equal(signer);
  });
});

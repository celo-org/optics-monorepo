const { waffle, ethers } = require('hardhat');
const { provider } = waffle;
const { expect } = require('chai');

const {
  testCases: signedFailureTestCases,
} = require('../../../vectors/signedFailureTestCases.json');

const remoteDomain = 1000;
const localDomain = 2000;
const optimisticSeconds = 3;
const initialCurrentRoot = ethers.utils.formatBytes32String('current');
const initialLastProcessed = 0;

describe('XAppConnectionManager', async () => {
  let connectionManager, replica, signer, updater;

  before(async () => {
    [signer] = provider.getWallets();
    updater = await optics.Updater.fromSigner(signer, remoteDomain);
  });

  beforeEach(async () => {
    const XAppConnectionManager = await ethers.getContractFactory(
      'TestXAppConnectionManager',
    );
    connectionManager = await XAppConnectionManager.deploy();
    await connectionManager.deployed();

    const controller = null;
    const { contracts } = await optics.deployUpgradeSetupAndProxy(
      'TestReplica',
      [localDomain],
      [
        remoteDomain,
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
    await connectionManager.ownerEnrollReplica(replica.address, domain);
    await connectionManager.setWatcherPermission(signer, domain, true);

    const watcher = await connectionManager.testRecoverWatcherFromSig(
      domain,
      replica.address,
      updater,
      ethers.utils.joinSignature(signature),
    );

    expect(watcher.toLowerCase()).to.equal(signer);
  });
});

const { provider } = waffle;
const { expect } = require('chai');
const { domainsToTestConfigs } = require('./generateTestChainConfigs');
const testUtils = require('../utils');
const { formatCall, sendFromSigner } = require('./crossChainTestUtils');
const {
  deployMultipleChains,
  getHome,
  getGovernanceRouter,
  getUpdaterManager,
} = require('./deployCrossChainTest');

/*
 * Deploy the full Optics suite on two chains
 */
describe('RecoveryManager', async () => {
  const domains = [1000, 2000];
  const domain = 1000;
  const walletProvider = new testUtils.WalletProvider(provider);
  const [governor, recoveryManager, newUpdaterSigner, tempRecoveryManager] =
    walletProvider.getWalletsPersistent(4);

  let governanceRouter, home, updaterManager, chainDetails;

  before(async () => {
    // generate TestChainConfigs for the given domains
    const configs = await domainsToTestConfigs(
      domains,
      recoveryManager.address,
    );

    // deploy the entire Optics suite on each chain
    chainDetails = await deployMultipleChains(configs);

    // get the governance router
    governanceRouter = getGovernanceRouter(chainDetails, domain);
    // transfer governorship to the governor signer
    await governanceRouter.transferGovernor(domain, governor.address);

    home = getHome(chainDetails, domain);

    updaterManager = getUpdaterManager(chainDetails, domain);
  });

  it('Before Recovery Initiated: Cannot Exit Recovery Before Initiated', async () => {
    await expect(
      sendFromSigner(recoveryManager, governanceRouter, 'exitRecovery', []),
    ).to.be.revertedWith('recovery not initiated');
  });

  it('Before Recovery Initiated: inRecovery is false', async () => {
    expect(await governanceRouter.inRecovery()).to.be.false;

    expect(await governanceRouter.recoveryActiveAt()).to.equal(0);
  });

  it('Before Recovery Initiated: Governor CAN call local and remote', async () => {
    // Format optics call message
    const call = await formatCall(updaterManager, 'setUpdater', [
      newUpdaterSigner.address,
    ]);

    // dispatch call on local governorRouter
    await expect(
      sendFromSigner(governor, governanceRouter, 'callLocal', [[call]]),
    )
      .to.emit(home, 'NewUpdater')
      .withArgs(newUpdaterSigner.address);

    // dispatch call on local governorRouter
    await expect(
      sendFromSigner(governor, governanceRouter, 'callRemote', [2000, [call]]),
    ).to.emit(home, 'Dispatch');
  });

  it('Before Recovery Initiated: RecoveryManager CANNOT call local OR remote', async () => {
    // Format optics call message
    const call = await formatCall(updaterManager, 'setUpdater', [
      newUpdaterSigner.address,
    ]);

    // dispatch call on local governorRouter
    await expect(
      sendFromSigner(recoveryManager, governanceRouter, 'callLocal', [[call]]),
    ).to.be.revertedWith('! called by governor');

    // dispatch call on local governorRouter
    await expect(
      sendFromSigner(recoveryManager, governanceRouter, 'callRemote', [
        2000,
        [call],
      ]),
    ).to.be.revertedWith('! called by governor');
  });

  it('Before Recovery Initiated: ONLY RecoveryManager CAN transfer role', async () => {
    await expect(
      sendFromSigner(governor, governanceRouter, 'transferRecoveryManager', [
        tempRecoveryManager.address,
      ]),
    ).to.be.revertedWith('! called by recovery manager');

    await expect(
      sendFromSigner(
        newUpdaterSigner,
        governanceRouter,
        'transferRecoveryManager',
        [tempRecoveryManager.address],
      ),
    ).to.be.revertedWith('! called by recovery manager');

    await expect(
      sendFromSigner(
        recoveryManager,
        governanceRouter,
        'transferRecoveryManager',
        [tempRecoveryManager.address],
      ),
    )
      .to.emit(governanceRouter, 'TransferRecoveryManager')
      .withArgs(recoveryManager.address, tempRecoveryManager.address);

    await expect(
      sendFromSigner(
        tempRecoveryManager,
        governanceRouter,
        'transferRecoveryManager',
        [recoveryManager.address],
      ),
    )
      .to.emit(governanceRouter, 'TransferRecoveryManager')
      .withArgs(tempRecoveryManager.address, recoveryManager.address);
  });

  it('Before Recovery Initiated: ONLY RecoveryManager can Initiate Recovery', async () => {
    await expect(
      sendFromSigner(
        governor,
        governanceRouter,
        'initiateRecoveryTimelock',
        [],
      ),
    ).to.be.revertedWith('! called by recovery manager');

    await expect(
      sendFromSigner(
        newUpdaterSigner,
        governanceRouter,
        'initiateRecoveryTimelock',
        [],
      ),
    ).to.be.revertedWith('! called by recovery manager');

    expect(await governanceRouter.recoveryActiveAt()).to.equal(0);

    const currBlockNumber = await provider.getBlockNumber();
    const recoveryTimelock = (
      await governanceRouter.recoveryTimelock()
    ).toNumber();
    const expectedRecoveryActiveAt = 1 + currBlockNumber + recoveryTimelock;

    await expect(
      sendFromSigner(
        recoveryManager,
        governanceRouter,
        'initiateRecoveryTimelock',
        [],
      ),
    )
      .to.emit(governanceRouter, 'InitiateRecovery')
      .withArgs(recoveryManager.address, expectedRecoveryActiveAt);

    expect(await governanceRouter.recoveryActiveAt()).to.equal(
      expectedRecoveryActiveAt,
    );
  });

  it('Before Recovery Active: CANNOT Initiate Recovery Twice', async () => {
    await expect(
      sendFromSigner(
        recoveryManager,
        governanceRouter,
        'initiateRecoveryTimelock',
        [],
      ),
    ).to.be.revertedWith('recovery already initiated');
  });

  it('Before Recovery Active: inRecovery is false', async () => {
    expect(await governanceRouter.inRecovery()).to.be.false;
  });

  it('Before Recovery Active: Governor CAN call local and remote', async () => {
    // Format optics call message
    const call = await formatCall(updaterManager, 'setUpdater', [
      newUpdaterSigner.address,
    ]);

    // dispatch call on local governorRouter
    await expect(
      sendFromSigner(governor, governanceRouter, 'callLocal', [[call]]),
    )
      .to.emit(home, 'NewUpdater')
      .withArgs(newUpdaterSigner.address);

    // dispatch call on local governorRouter
    await expect(
      sendFromSigner(governor, governanceRouter, 'callRemote', [2000, [call]]),
    ).to.emit(home, 'Dispatch');
  });

  it('Before Recovery Active: RecoveryManager CANNOT call local OR remote', async () => {
    // Format optics call message
    const call = await formatCall(updaterManager, 'setUpdater', [
      newUpdaterSigner.address,
    ]);

    // dispatch call on local governorRouter
    await expect(
      sendFromSigner(recoveryManager, governanceRouter, 'callLocal', [[call]]),
    ).to.be.revertedWith('! called by governor');

    // dispatch call on local governorRouter
    await expect(
      sendFromSigner(recoveryManager, governanceRouter, 'callRemote', [
        2000,
        [call],
      ]),
    ).to.be.revertedWith('! called by governor');
  });

  it('Before Recovery Active: ONLY RecoveryManager CAN transfer role', async () => {
    await expect(
      sendFromSigner(governor, governanceRouter, 'transferRecoveryManager', [
        tempRecoveryManager.address,
      ]),
    ).to.be.revertedWith('! called by recovery manager');

    await expect(
      sendFromSigner(
        newUpdaterSigner,
        governanceRouter,
        'transferRecoveryManager',
        [tempRecoveryManager.address],
      ),
    ).to.be.revertedWith('! called by recovery manager');

    await expect(
      sendFromSigner(
        recoveryManager,
        governanceRouter,
        'transferRecoveryManager',
        [tempRecoveryManager.address],
      ),
    )
      .to.emit(governanceRouter, 'TransferRecoveryManager')
      .withArgs(recoveryManager.address, tempRecoveryManager.address);

    await expect(
      sendFromSigner(
        tempRecoveryManager,
        governanceRouter,
        'transferRecoveryManager',
        [recoveryManager.address],
      ),
    )
      .to.emit(governanceRouter, 'TransferRecoveryManager')
      .withArgs(tempRecoveryManager.address, recoveryManager.address);
  });

  it('Before Recovery Active: ONLY RecoveryManager can Exit Recovery; CAN Exit Recovery before Recovery is Active', async () => {
    await expect(
      sendFromSigner(governor, governanceRouter, 'exitRecovery', []),
    ).to.be.revertedWith('! called by recovery manager');

    await expect(
      sendFromSigner(newUpdaterSigner, governanceRouter, 'exitRecovery', []),
    ).to.be.revertedWith('! called by recovery manager');

    await expect(
      sendFromSigner(recoveryManager, governanceRouter, 'exitRecovery', []),
    )
      .to.emit(governanceRouter, 'ExitRecovery')
      .withArgs(recoveryManager.address);
  });

  it('Before Recovery Active: CAN Initiate Recovery a second time', async () => {
    await expect(
      sendFromSigner(
        recoveryManager,
        governanceRouter,
        'initiateRecoveryTimelock',
        [],
      ),
    ).to.emit(governanceRouter, 'InitiateRecovery');
  });

  it('Recovery Active: inRecovery becomes true when timelock expires', async () => {
    const recoveryActiveAt = await governanceRouter.recoveryActiveAt();
    let currBlockNumber = await provider.getBlockNumber();

    while (currBlockNumber < recoveryActiveAt) {
      expect(await governanceRouter.inRecovery()).to.be.false;
      await provider.send('evm_mine');
      currBlockNumber++;
    }

    // AT recoveryActiveAt block, inRecovery is true
    expect(await provider.getBlockNumber()).to.equal(recoveryActiveAt);
    expect(await governanceRouter.inRecovery()).to.be.true;

    // AFTER recoveryActiveAt block, inRecovery is true
    await provider.send('evm_mine');
    await provider.send('evm_mine');

    expect(await governanceRouter.inRecovery()).to.be.true;
  });

  it('Recovery Active: RecoveryManager CAN call local', async () => {
    // Format optics call message
    const call = await formatCall(updaterManager, 'setUpdater', [
      newUpdaterSigner.address,
    ]);

    // dispatch call on local governorRouter
    await expect(
      sendFromSigner(recoveryManager, governanceRouter, 'callLocal', [[call]]),
    )
      .to.emit(home, 'NewUpdater')
      .withArgs(newUpdaterSigner.address);
  });

  it('Recovery Active: RecoveryManager CANNOT call remote', async () => {
    // Format optics call message
    const call = await formatCall(updaterManager, 'setUpdater', [
      newUpdaterSigner.address,
    ]);

    // dispatch call on local governorRouter
    await expect(
      sendFromSigner(recoveryManager, governanceRouter, 'callRemote', [
        2000,
        [call],
      ]),
    ).to.be.revertedWith('! called by governor');
  });

  it('Recovery Active: ONLY RecoveryManager CAN transfer role', async () => {
    await expect(
      sendFromSigner(governor, governanceRouter, 'transferRecoveryManager', [
        tempRecoveryManager.address,
      ]),
    ).to.be.revertedWith('! called by recovery manager');

    await expect(
      sendFromSigner(
        newUpdaterSigner,
        governanceRouter,
        'transferRecoveryManager',
        [tempRecoveryManager.address],
      ),
    ).to.be.revertedWith('! called by recovery manager');

    await expect(
      sendFromSigner(
        recoveryManager,
        governanceRouter,
        'transferRecoveryManager',
        [tempRecoveryManager.address],
      ),
    )
      .to.emit(governanceRouter, 'TransferRecoveryManager')
      .withArgs(recoveryManager.address, tempRecoveryManager.address);

    await expect(
      sendFromSigner(
        tempRecoveryManager,
        governanceRouter,
        'transferRecoveryManager',
        [recoveryManager.address],
      ),
    )
      .to.emit(governanceRouter, 'TransferRecoveryManager')
      .withArgs(tempRecoveryManager.address, recoveryManager.address);
  });

  it('Recovery Active: Governor CANNOT call local OR remote', async () => {
    // Format optics call message
    const call = await formatCall(updaterManager, 'setUpdater', [
      newUpdaterSigner.address,
    ]);

    // dispatch call on local governorRouter
    await expect(
      sendFromSigner(governor, governanceRouter, 'callLocal', [[call]]),
    ).to.be.revertedWith('! called by recovery manager');

    // dispatch call on local governorRouter
    await expect(
      sendFromSigner(governor, governanceRouter, 'callRemote', [2000, [call]]),
    ).to.be.revertedWith('in recovery');
  });

  it('Recovery Active: ONLY RecoveryManager can Exit Recovery', async () => {
    await expect(
      sendFromSigner(governor, governanceRouter, 'exitRecovery', []),
    ).to.be.revertedWith('! called by recovery manager');

    await expect(
      sendFromSigner(newUpdaterSigner, governanceRouter, 'exitRecovery', []),
    ).to.be.revertedWith('! called by recovery manager');

    await expect(
      sendFromSigner(recoveryManager, governanceRouter, 'exitRecovery', []),
    )
      .to.emit(governanceRouter, 'ExitRecovery')
      .withArgs(recoveryManager.address);
  });

  it('Exited Recovery: inRecovery is false', async () => {
    expect(await governanceRouter.inRecovery()).to.be.false;

    expect(await governanceRouter.recoveryActiveAt()).to.equal(0);
  });

  it('Exited Recovery: Governor CAN call local and remote', async () => {
    // Format optics call message
    const call = await formatCall(updaterManager, 'setUpdater', [
      newUpdaterSigner.address,
    ]);

    // dispatch call on local governorRouter
    await expect(
      sendFromSigner(governor, governanceRouter, 'callLocal', [[call]]),
    )
      .to.emit(home, 'NewUpdater')
      .withArgs(newUpdaterSigner.address);

    // dispatch call on local governorRouter
    await expect(
      sendFromSigner(governor, governanceRouter, 'callRemote', [2000, [call]]),
    ).to.emit(home, 'Dispatch');
  });

  it('Exited Recovery: RecoveryManager CANNOT call local OR remote', async () => {
    // Format optics call message
    const call = await formatCall(updaterManager, 'setUpdater', [
      newUpdaterSigner.address,
    ]);

    // dispatch call on local governorRouter
    await expect(
      sendFromSigner(recoveryManager, governanceRouter, 'callLocal', [[call]]),
    ).to.be.revertedWith('! called by governor');

    // dispatch call on local governorRouter
    await expect(
      sendFromSigner(recoveryManager, governanceRouter, 'callRemote', [
        2000,
        [call],
      ]),
    ).to.be.revertedWith('! called by governor');
  });

  it('Exited Recovery: ONLY RecoveryManager CAN transfer role', async () => {
    await expect(
      sendFromSigner(governor, governanceRouter, 'transferRecoveryManager', [
        tempRecoveryManager.address,
      ]),
    ).to.be.revertedWith('! called by recovery manager');

    await expect(
      sendFromSigner(
        newUpdaterSigner,
        governanceRouter,
        'transferRecoveryManager',
        [tempRecoveryManager.address],
      ),
    ).to.be.revertedWith('! called by recovery manager');

    await expect(
      sendFromSigner(
        recoveryManager,
        governanceRouter,
        'transferRecoveryManager',
        [tempRecoveryManager.address],
      ),
    )
      .to.emit(governanceRouter, 'TransferRecoveryManager')
      .withArgs(recoveryManager.address, tempRecoveryManager.address);

    await expect(
      sendFromSigner(
        tempRecoveryManager,
        governanceRouter,
        'transferRecoveryManager',
        [recoveryManager.address],
      ),
    )
      .to.emit(governanceRouter, 'TransferRecoveryManager')
      .withArgs(tempRecoveryManager.address, recoveryManager.address);
  });
});

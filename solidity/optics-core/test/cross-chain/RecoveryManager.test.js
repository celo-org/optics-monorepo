const { provider } = waffle;
const { expect } = require('chai');
const testUtils = require('../utils');
const { domainsToTestConfigs } = require('./generateTestChainConfigs');
const { formatCall, sendFromSigner } = require('./crossChainTestUtils');
const {
  deployMultipleChains,
  getHome,
  getGovernanceRouter,
  getUpdaterManager,
} = require('./deployCrossChainTest');

async function expectNotInRecovery(
  updaterManager,
  recoveryManager,
  randomSigner,
  governor,
  governanceRouter,
  home,
) {
  expect(await governanceRouter.inRecovery()).to.be.false;

  // Format optics call message
  const call = await formatCall(updaterManager, 'setUpdater', [
    randomSigner.address,
  ]);

  // Expect that Governor *CAN* Call Local & Call Remote
  // dispatch call on local governorRouter
  await expect(
    sendFromSigner(governor, governanceRouter, 'callLocal', [[call]]),
  )
    .to.emit(home, 'NewUpdater')
    .withArgs(randomSigner.address);

  // dispatch call on local governorRouter
  await expect(
    sendFromSigner(governor, governanceRouter, 'callRemote', [2000, [call]]),
  ).to.emit(home, 'Dispatch');

  // set xApp Connection Manager
  const xAppConnectionManager = await governanceRouter.xAppConnectionManager();
  await expect(
    sendFromSigner(governor, governanceRouter, 'setXAppConnectionManager', [
      randomSigner.address,
    ]),
  ).to.not.be.reverted;
  // reset xApp Connection Manager to actual contract
  await sendFromSigner(governor, governanceRouter, 'setXAppConnectionManager', [
    xAppConnectionManager,
  ]);

  // set Router Locally
  const otherDomain = 2000;
  const previousRouter = await governanceRouter.routers(otherDomain);
  await expect(
    sendFromSigner(governor, governanceRouter, 'setRouterLocal', [
      2000,
      optics.ethersAddressToBytes32(randomSigner.address),
    ]),
  )
    .to.emit(governanceRouter, 'SetRouter')
    .withArgs(
      otherDomain,
      previousRouter,
      optics.ethersAddressToBytes32(randomSigner.address),
    );

  // Expect that Recovery Manager CANNOT Call Local OR Call Remote
  // cannot dispatch call on local governorRouter
  await expect(
    sendFromSigner(recoveryManager, governanceRouter, 'callLocal', [[call]]),
  ).to.be.revertedWith('! called by governor');

  // cannot dispatch call to remote governorRouter
  await expect(
    sendFromSigner(recoveryManager, governanceRouter, 'callRemote', [
      2000,
      [call],
    ]),
  ).to.be.revertedWith('! called by governor');

  // cannot set xAppConnectionManager
  await expect(
    sendFromSigner(
      recoveryManager,
      governanceRouter,
      'setXAppConnectionManager',
      [randomSigner.address],
    ),
  ).to.be.revertedWith('! called by governor');

  // cannot set Router
  await expect(
    sendFromSigner(recoveryManager, governanceRouter, 'setRouterLocal', [
      2000,
      optics.ethersAddressToBytes32(randomSigner.address),
    ]),
  ).to.be.revertedWith('! called by governor');
}

async function expectOnlyRecoveryManagerCanTransferRole(
  governor,
  governanceRouter,
  randomSigner,
  recoveryManager,
) {
  await expect(
    sendFromSigner(governor, governanceRouter, 'transferRecoveryManager', [
      randomSigner.address,
    ]),
  ).to.be.revertedWith('! called by recovery manager');

  await expect(
    sendFromSigner(randomSigner, governanceRouter, 'transferRecoveryManager', [
      randomSigner.address,
    ]),
  ).to.be.revertedWith('! called by recovery manager');

  await expect(
    sendFromSigner(
      recoveryManager,
      governanceRouter,
      'transferRecoveryManager',
      [randomSigner.address],
    ),
  )
    .to.emit(governanceRouter, 'TransferRecoveryManager')
    .withArgs(recoveryManager.address, randomSigner.address);

  await expect(
    sendFromSigner(randomSigner, governanceRouter, 'transferRecoveryManager', [
      recoveryManager.address,
    ]),
  )
    .to.emit(governanceRouter, 'TransferRecoveryManager')
    .withArgs(randomSigner.address, recoveryManager.address);
}

async function expectOnlyRecoveryManagerCanExitRecovery(
  governor,
  governanceRouter,
  randomSigner,
  recoveryManager,
) {
  await expect(
    sendFromSigner(governor, governanceRouter, 'exitRecovery', []),
  ).to.be.revertedWith('! called by recovery manager');

  await expect(
    sendFromSigner(randomSigner, governanceRouter, 'exitRecovery', []),
  ).to.be.revertedWith('! called by recovery manager');

  await expect(
    sendFromSigner(recoveryManager, governanceRouter, 'exitRecovery', []),
  )
    .to.emit(governanceRouter, 'ExitRecovery')
    .withArgs(recoveryManager.address);
}

async function expectOnlyRecoveryManagerCanInitiateRecovery(
  governor,
  governanceRouter,
  randomSigner,
  recoveryManager,
) {
  await expect(
    sendFromSigner(governor, governanceRouter, 'initiateRecoveryTimelock', []),
  ).to.be.revertedWith('! called by recovery manager');

  await expect(
    sendFromSigner(
      randomSigner,
      governanceRouter,
      'initiateRecoveryTimelock',
      [],
    ),
  ).to.be.revertedWith('! called by recovery manager');

  expect(await governanceRouter.recoveryActiveAt()).to.equal(0);

  await expect(
    sendFromSigner(
      recoveryManager,
      governanceRouter,
      'initiateRecoveryTimelock',
      [],
    ),
  ).to.emit(governanceRouter, 'InitiateRecovery');

  expect(await governanceRouter.recoveryActiveAt()).to.not.equal(0);
}

/*
 * Deploy the full Optics suite on two chains
 */
describe('RecoveryManager', async () => {
  const domains = [1000, 2000];
  const domain = 1000;
  const walletProvider = new testUtils.WalletProvider(provider);
  const [governor, recoveryManager, randomSigner] =
    walletProvider.getWalletsPersistent(5);

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

  it('Before Recovery Initiated: Timelock has not been set', async () => {
    expect(await governanceRouter.recoveryActiveAt()).to.equal(0);
  });

  it('Before Recovery Initiated: Cannot Exit Recovery yet', async () => {
    await expect(
      sendFromSigner(recoveryManager, governanceRouter, 'exitRecovery', []),
    ).to.be.revertedWith('recovery not initiated');
  });

  it('Before Recovery Initiated: Not in Recovery (Governor CAN Call Local & Remote; Recovery Manager CANNOT Call either)', async () => {
    await expectNotInRecovery(
      updaterManager,
      recoveryManager,
      randomSigner,
      governor,
      governanceRouter,
      home,
    );
  });

  it('Before Recovery Initiated: ONLY RecoveryManager can transfer RecoveryManager role', async () => {
    await expectOnlyRecoveryManagerCanTransferRole(
      governor,
      governanceRouter,
      randomSigner,
      recoveryManager,
    );
  });

  it('Before Recovery Initiated: ONLY RecoveryManager can Initiate Recovery', async () => {
    await expectOnlyRecoveryManagerCanInitiateRecovery(
      governor,
      governanceRouter,
      randomSigner,
      recoveryManager,
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

  it('Before Recovery Active: Not in Recovery (Governor CAN Call Local & Remote; Recovery Manager CANNOT Call either)', async () => {
    await expectNotInRecovery(
      updaterManager,
      recoveryManager,
      randomSigner,
      governor,
      governanceRouter,
      home,
    );
  });

  it('Before Recovery Active: ONLY RecoveryManager can transfer RecoveryManager role', async () => {
    await expectOnlyRecoveryManagerCanTransferRole(
      governor,
      governanceRouter,
      randomSigner,
      recoveryManager,
    );
  });

  it('Before Recovery Active: ONLY RecoveryManager can Exit Recovery', async () => {
    await expectOnlyRecoveryManagerCanExitRecovery(
      governor,
      governanceRouter,
      randomSigner,
      recoveryManager,
    );
  });

  it('Before Recovery Active: ONLY RecoveryManager can Initiate Recovery (CAN initiate a second time)', async () => {
    await expectOnlyRecoveryManagerCanInitiateRecovery(
      governor,
      governanceRouter,
      randomSigner,
      recoveryManager,
    );
  });

  it('Recovery Active: inRecovery becomes true when timelock expires', async () => {
    // increase timestamp on-chain
    const timelock = await governanceRouter.recoveryTimelock();
    await testUtils.increaseTimestampBy(provider, timelock.toNumber());
    expect(await governanceRouter.inRecovery()).to.be.true;
  });

  it('Recovery Active: RecoveryManager CAN call local', async () => {
    // Format optics call message
    const call = await formatCall(updaterManager, 'setUpdater', [
      randomSigner.address,
    ]);

    // dispatch call on local governorRouter
    await expect(
      sendFromSigner(recoveryManager, governanceRouter, 'callLocal', [[call]]),
    )
      .to.emit(home, 'NewUpdater')
      .withArgs(randomSigner.address);
  });

  it('Recovery Active: RecoveryManager CANNOT call remote', async () => {
    // Format optics call message
    const call = await formatCall(updaterManager, 'setUpdater', [
      randomSigner.address,
    ]);

    // dispatch call on local governorRouter
    await expect(
      sendFromSigner(recoveryManager, governanceRouter, 'callRemote', [
        2000,
        [call],
      ]),
    ).to.be.revertedWith('! called by governor');
  });

  it('Recovery Active: RecoveryManager CAN set xAppConnectionManager', async () => {
    // set xApp Connection Manager
    const xAppConnectionManager =
      await governanceRouter.xAppConnectionManager();
    await expect(
      sendFromSigner(
        recoveryManager,
        governanceRouter,
        'setXAppConnectionManager',
        [randomSigner.address],
      ),
    ).to.not.be.reverted;
    // reset xApp Connection Manager to actual contract
    await sendFromSigner(
      recoveryManager,
      governanceRouter,
      'setXAppConnectionManager',
      [xAppConnectionManager],
    );
  });

  it('Recovery Active: RecoveryManager CAN set Router locally', async () => {
    const otherDomain = 2000;
    const previousRouter = await governanceRouter.routers(otherDomain);
    await expect(
      sendFromSigner(recoveryManager, governanceRouter, 'setRouterLocal', [
        2000,
        optics.ethersAddressToBytes32(randomSigner.address),
      ]),
    )
      .to.emit(governanceRouter, 'SetRouter')
      .withArgs(
        otherDomain,
        previousRouter,
        optics.ethersAddressToBytes32(randomSigner.address),
      );
  });

  it('Recovery Active: Governor CANNOT call local OR remote', async () => {
    // Format optics call message
    const call = await formatCall(updaterManager, 'setUpdater', [
      randomSigner.address,
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

  it('Recovery Active: Governor CANNOT set xAppConnectionManager', async () => {
    // cannot set xAppConnectionManager
    await expect(
      sendFromSigner(governor, governanceRouter, 'setXAppConnectionManager', [
        randomSigner.address,
      ]),
    ).to.be.revertedWith('! called by recovery manager');
  });

  it('Recovery Active: Governor CANNOT set Router locally', async () => {
    // cannot set Router
    await expect(
      sendFromSigner(governor, governanceRouter, 'setRouterLocal', [
        2000,
        optics.ethersAddressToBytes32(randomSigner.address),
      ]),
    ).to.be.revertedWith('! called by recovery manager');
  });

  it('Recovery Active: ONLY RecoveryManager can transfer RecoveryManager role', async () => {
    await expectOnlyRecoveryManagerCanTransferRole(
      governor,
      governanceRouter,
      randomSigner,
      recoveryManager,
    );
  });

  it('Recovery Active: ONLY RecoveryManager can Exit Recovery', async () => {
    await expectOnlyRecoveryManagerCanExitRecovery(
      governor,
      governanceRouter,
      randomSigner,
      recoveryManager,
    );
  });

  it('Exited Recovery: Timelock is deleted', async () => {
    expect(await governanceRouter.recoveryActiveAt()).to.equal(0);
  });

  it('Exited Recovery: Not in Recovery (Governor CAN Call Local & Remote; Recovery Manager CANNOT Call either)', async () => {
    await expectNotInRecovery(
      updaterManager,
      recoveryManager,
      randomSigner,
      governor,
      governanceRouter,
      home,
    );
  });

  it('Exited Recovery: ONLY RecoveryManager can transfer RecoveryManager role', async () => {
    await expectOnlyRecoveryManagerCanTransferRole(
      governor,
      governanceRouter,
      randomSigner,
      recoveryManager,
    );
  });
});

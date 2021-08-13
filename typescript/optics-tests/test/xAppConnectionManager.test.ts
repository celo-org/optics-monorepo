import { ethers, optics } from 'hardhat';
import { expect } from 'chai';

import { getTestDeploy } from './testChain';
import { Updater } from '../lib/core';
import { Signer } from '../lib/types';
import { CoreDeploy as Deploy } from '../../optics-deploy/src/core/CoreDeploy';
import * as deploys from '../../optics-deploy/src/core';
import { BeaconProxy } from '../../optics-deploy/src/proxyUtils';
import * as contracts from '../../typechain/optics-core';

import signedFailureTestCases from '../../../vectors/signedFailure.json';

const ONLY_OWNER_REVERT_MSG = 'Ownable: caller is not the owner';
const localDomain = 1000;
const remoteDomain = 2000;

describe('XAppConnectionManager', async () => {
  let localDeploy: Deploy,
    remoteDeploy: Deploy,
    connectionManager: contracts.TestXAppConnectionManager,
    updaterManager: contracts.UpdaterManager,
    enrolledReplica: contracts.TestReplica,
    home: BeaconProxy<contracts.Home>,
    signer: Signer,
    updater: Updater;

  before(async () => {
    [signer] = await ethers.getSigners();
    updater = await Updater.fromSigner(signer, localDomain);

    // get fresh test deploys
    localDeploy = await getTestDeploy(localDomain, updater.address, []);
    remoteDeploy = await getTestDeploy(remoteDomain, updater.address, []);

    // deploy optics on remote domain
    // NB: as tests stand currently, this only needs to be done once
    await deploys.deployOptics(remoteDeploy);
  });

  beforeEach(async () => {
    // deploy optics on local domain
    await deploys.deployOptics(localDeploy);

    // deploy replica and enroll on local deploy
    await deploys.enrollRemote(localDeploy, remoteDeploy);

    // set respective variables
    connectionManager = localDeploy.contracts
      .xAppConnectionManager! as contracts.TestXAppConnectionManager;
    updaterManager = localDeploy.contracts.updaterManager!;
    enrolledReplica = localDeploy.contracts.replicas[remoteDomain]
      .proxy as contracts.TestReplica;
    home = localDeploy.contracts.home!;
  });

  it('Returns the local domain', async () => {
    expect(await connectionManager!.localDomain()).to.equal(localDomain);
  });

  it('onlyOwner function rejects call from non-owner', async () => {
    const [nonOwner, nonHome] = await ethers.getSigners();
    await expect(
      connectionManager.connect(nonOwner).setHome(nonHome.address),
    ).to.be.revertedWith(ONLY_OWNER_REVERT_MSG);
  });

  it('isOwner returns true for owner and false for non-owner', async () => {
    const [newOwner, nonOwner] = await ethers.getSigners();
    await connectionManager.transferOwnership(newOwner.address);
    expect(await connectionManager.isOwner(newOwner.address)).to.be.true;
    expect(await connectionManager.isOwner(nonOwner.address)).to.be.false;
  });

  it('isReplica returns true for enrolledReplica and false for non-enrolled Replica', async () => {
    const [nonEnrolledReplica] = await ethers.getSigners();
    expect(await connectionManager.isReplica(enrolledReplica.address)).to.be
      .true;
    expect(await connectionManager.isReplica(nonEnrolledReplica.address)).to.be
      .false;
  });

  it('Allows owner to set the home', async () => {
    await deploys.deployHome(localDeploy);
    const newHome = localDeploy.contracts.home?.proxy as contracts.TestHome;

    await connectionManager.setHome(newHome.address);
    expect(await connectionManager.home()).to.equal(newHome.address);
  });

  it('Owner can enroll a new replica', async () => {
    const newRemoteDomain = 3000;
    const newRemoteDeploy = await getTestDeploy(
      newRemoteDomain,
      updater.address,
      [],
    );
    // await deploys.deployOptics(newRemoteDeploy);
    await deploys.deployUnenrolledReplica(localDeploy, newRemoteDeploy);
    const newReplicaProxy =
      localDeploy.contracts.replicas[newRemoteDomain].proxy;

    // Assert new replica not considered replica before enrolled
    expect(await connectionManager.isReplica(newReplicaProxy.address)).to.be
      .false;

    await expect(
      connectionManager.ownerEnrollReplica(
        newReplicaProxy.address,
        newRemoteDomain,
      ),
    ).to.emit(connectionManager, 'ReplicaEnrolled');

    expect(await connectionManager.domainToReplica(newRemoteDomain)).to.equal(
      newReplicaProxy.address,
    );
    expect(
      await connectionManager.replicaToDomain(newReplicaProxy.address),
    ).to.equal(newRemoteDomain);
    expect(await connectionManager.isReplica(newReplicaProxy.address)).to.be
      .true;
  });

  it('Owner can unenroll a replica', async () => {
    await expect(
      connectionManager.ownerUnenrollReplica(enrolledReplica.address),
    ).to.emit(connectionManager, 'ReplicaUnenrolled');

    expect(
      await connectionManager.replicaToDomain(enrolledReplica.address),
    ).to.equal(0);
    expect(await connectionManager.domainToReplica(localDomain)).to.equal(
      ethers.constants.AddressZero,
    );
    expect(await connectionManager.isReplica(enrolledReplica.address)).to.be
      .false;
  });

  it('Owner can set watcher permissions', async () => {
    const [watcher] = await ethers.getSigners();
    expect(
      await connectionManager.watcherPermission(watcher.address, remoteDomain),
    ).to.be.false;

    await expect(
      connectionManager.setWatcherPermission(
        watcher.address,
        remoteDomain,
        true,
      ),
    ).to.emit(connectionManager, 'WatcherPermissionSet');

    expect(
      await connectionManager.watcherPermission(watcher.address, remoteDomain),
    ).to.be.true;
  });

  it('Unenrolls a replica given valid SignedFailureNotification', async () => {
    // Set watcher permissions for domain of currently enrolled replica
    const [watcher] = await ethers.getSigners();
    await connectionManager.setWatcherPermission(
      watcher.address,
      remoteDomain,
      true,
    );

    // Create signed failure notification and signature
    const { failureNotification, signature } =
      await optics.signedFailureNotification(
        watcher,
        remoteDomain,
        updater.signer.address,
      );

    // Assert new replica considered replica before unenrolled
    expect(await connectionManager.isReplica(enrolledReplica.address)).to.be
      .true;

    // Unenroll replica using data + signature
    await expect(
      connectionManager.unenrollReplica(
        failureNotification.domain,
        failureNotification.updaterBytes32,
        signature,
      ),
    ).to.emit(connectionManager, 'ReplicaUnenrolled');

    expect(
      await connectionManager.replicaToDomain(enrolledReplica.address),
    ).to.equal(0);
    expect(await connectionManager.domainToReplica(localDomain)).to.equal(
      ethers.constants.AddressZero,
    );
    expect(await connectionManager.isReplica(enrolledReplica.address)).to.be
      .false;
  });

  it('unenrollReplica reverts if there is no replica for provided domain', async () => {
    const noReplicaDomain = 3000;

    // Set watcher permissions for noReplicaDomain
    const [watcher] = await ethers.getSigners();
    await connectionManager.setWatcherPermission(
      watcher.address,
      noReplicaDomain,
      true,
    );

    // Create signed failure notification and signature for noReplicaDomain
    const { failureNotification, signature } =
      await optics.signedFailureNotification(
        watcher,
        noReplicaDomain,
        updater.signer.address,
      );

    // Expect unenrollReplica call to revert
    await expect(
      connectionManager.unenrollReplica(
        failureNotification.domain,
        failureNotification.updaterBytes32,
        signature,
      ),
    ).to.be.revertedWith('!replica exists');
  });

  it('unenrollReplica reverts if provided updater does not match replica updater', async () => {
    const [watcher, nonUpdater] = await ethers.getSigners();

    // Set watcher permissions
    await connectionManager.setWatcherPermission(
      watcher.address,
      remoteDomain,
      true,
    );

    // Create signed failure notification and signature with nonUpdater
    const { failureNotification, signature } =
      await optics.signedFailureNotification(
        watcher,
        remoteDomain,
        nonUpdater.address,
      );

    // Expect unenrollReplica call to revert
    await expect(
      connectionManager.unenrollReplica(
        failureNotification.domain,
        failureNotification.updaterBytes32,
        signature,
      ),
    ).to.be.revertedWith('!current updater');
  });

  it('unenrollReplica reverts if incorrect watcher provided', async () => {
    const [watcher, nonWatcher] = await ethers.getSigners();

    // Set watcher permissions
    await connectionManager.setWatcherPermission(
      watcher.address,
      remoteDomain,
      true,
    );

    // Create signed failure notification and signature with nonWatcher
    const { failureNotification, signature } =
      await optics.signedFailureNotification(
        nonWatcher,
        remoteDomain,
        updater.signer.address,
      );

    // Expect unenrollReplica call to revert
    await expect(
      connectionManager.unenrollReplica(
        failureNotification.domain,
        failureNotification.updaterBytes32,
        signature,
      ),
    ).to.be.revertedWith('!valid watcher');
  });

  it('Checks Rust-produced SignedFailureNotification', async () => {
    // Compare Rust output in json file to solidity output
    const testCase = signedFailureTestCases[0];
    const { domain, updater, signature, signer } = testCase;

    await enrolledReplica.setUpdater(updater);
    await connectionManager.setWatcherPermission(signer, domain, true);

    // Just performs signature recovery (not dependent on replica state, just
    // tests functionality)
    const watcher = await connectionManager.testRecoverWatcherFromSig(
      domain,
      enrolledReplica.address,
      updater,
      ethers.utils.joinSignature(signature),
    );

    expect(watcher.toLowerCase()).to.equal(signer);
  });
});

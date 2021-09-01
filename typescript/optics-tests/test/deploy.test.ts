import { ethers } from 'hardhat';
import { expect } from 'chai';
import * as types from 'ethers';

import { getTestDeploy } from './testChain';
import { Updater } from '../lib/core';
import { Signer } from '../lib/types';
import { CoreDeploy as Deploy } from '../../optics-deploy/src/core/CoreDeploy';
import { deployTwoChains, deployNChains } from '../../optics-deploy/src/core';
import { BeaconProxy } from '../../optics-deploy/src/proxyUtils';

const domains = [1000, 2000, 3000];

function assertBeaconProxy(beaconProxy: BeaconProxy<types.Contract>) {
  expect(beaconProxy.beacon).to.not.be.undefined;
  expect(beaconProxy.proxy).to.not.be.undefined;
  expect(beaconProxy.implementation).to.not.be.undefined;
}

export async function checkDeploy(
  deploy: Deploy,
  remoteDomains: number[],
  governorDomain: number
) {
  // Home upgrade setup contracts are defined
  assertBeaconProxy(deploy.contracts.home!);

  // updaterManager is set on Home
  const updaterManager = await deploy.contracts.home?.proxy.updaterManager();
  expect(updaterManager).to.equal(deploy.contracts.updaterManager?.address);

  // GovernanceRouter upgrade setup contracts are defined
  assertBeaconProxy(deploy.contracts.governance!);

  remoteDomains.forEach(async domain => {
    // Replica upgrade setup contracts are defined
    assertBeaconProxy(deploy.contracts.replicas[domain]!);
    // governanceRouter for remote domain is registered
    const registeredRouter = await deploy.contracts.governance?.proxy.routers(domain);
    expect(registeredRouter).to.not.equal(ethers.constants.AddressZero);
    // replica is enrolled in xAppConnectionManager
    const enrolledReplica = await deploy.contracts.xAppConnectionManager?.domainToReplica(domain);
    expect(enrolledReplica).to.not.equal(ethers.constants.AddressZero);
    //watchers have permission in xAppConnectionManager
    deploy.config.watchers.forEach(async watcher => {
      const watcherPermissions = await deploy.contracts.xAppConnectionManager?.watcherPermission(watcher, domain);
      expect(watcherPermissions).to.be.true;
    });
  });

  // contracts are defined
  expect(deploy.contracts.updaterManager).to.not.be.undefined;
  expect(deploy.contracts.upgradeBeaconController).to.not.be.undefined;
  expect(deploy.contracts.xAppConnectionManager).to.not.be.undefined;

  // governor is set on governor chain, empty on others
  const gov = await deploy.contracts.governance?.proxy.governor();
  const localDomain = await deploy.contracts.home?.proxy.localDomain()
  if (governorDomain == localDomain) {
    expect(gov).to.not.equal(ethers.constants.AddressZero);
  } else {
    expect(gov).to.equal(ethers.constants.AddressZero);
  }
  // governor domain is correct
  expect(await deploy.contracts.governance?.proxy.governorDomain()).to.equal(governorDomain);

  // Home is set on xAppConnectionManager
  const xAppManagerHome = await deploy.contracts.xAppConnectionManager?.home();
  const homeAddress = deploy.contracts.home?.proxy.address
  expect(xAppManagerHome).to.equal(homeAddress);

  // governor has ownership over following contracts
  const updaterManagerOwner = await deploy.contracts.updaterManager?.owner();
  const xAppManagerOwner = await deploy.contracts.xAppConnectionManager?.owner();
  const beaconOwner = await deploy.contracts.upgradeBeaconController?.owner();
  const homeOwner = await deploy.contracts.home?.proxy.owner();
  const governorAddr = deploy.contracts.governance?.proxy.address;
  expect(updaterManagerOwner).to.equal(governorAddr);
  expect(xAppManagerOwner).to.equal(governorAddr);
  expect(beaconOwner).to.equal(governorAddr);
  expect(homeOwner).to.equal(governorAddr);
}

/*
 * Deploy the full Optics suite on two chains
 */
describe.only('DeployNChains', async () => {
  let signer: Signer,
    recoveryManager: Signer,
    updater: Updater;

  before(async () => {
    [signer, recoveryManager] = await ethers.getSigners();
    updater = await Updater.fromSigner(signer, domains[0]);
  });

  it('asserts all elements in three-chain deploy are correct', async () => {
    let deploys: Deploy[] = [];
    for (var i = 0; i < 3; i++) {
      deploys.push(await getTestDeploy(domains[i], updater.address, [recoveryManager.address]));
    }
    // deploy the entire Optics suite on each chain
    await deployNChains(deploys);

    await checkDeploy(deploys[0], [domains[1], domains[2]], domains[0]);
    await checkDeploy(deploys[1], [domains[0], domains[2]], domains[0]);
    await checkDeploy(deploys[2], [domains[0], domains[1]], domains[0]);
  });

  it('asserts all elements in two-chain deploy are correct', async () => {
    let deploys: Deploy[] = [];
    for (var i = 0; i < 2; i++) {
      deploys.push(await getTestDeploy(domains[i], updater.address, [recoveryManager.address]));
    }

    await deployTwoChains(deploys[0], deploys[1]);

    await checkDeploy(deploys[0], [domains[1]], domains[0]);
    await checkDeploy(deploys[1], [domains[0]], domains[0]);
  })
});

import { ethers } from 'hardhat';
import { expect } from 'chai';
import * as types from 'ethers';

import { getTestDeploy } from './testChain';
import { Updater } from '../lib/core';
import { Signer } from '../lib/types';
import { CoreDeploy as Deploy } from '../../optics-deploy/src/core/CoreDeploy';
import { deployNChains } from '../../optics-deploy/src/core';
import { BeaconProxy } from '../../optics-deploy/src/proxyUtils';

const domains = [1000, 2000, 3000];

function assertBeaconProxy(beaconProxy: BeaconProxy<types.Contract>) {
  expect(beaconProxy.beacon).to.not.be.undefined;
  expect(beaconProxy.proxy).to.not.be.undefined;
  expect(beaconProxy.implementation).to.not.be.undefined;
}

export async function deployCorrect(
  deploy: Deploy,
  replicaDomains: number[],
  governorDomain: number
) {
  // console.log(deploy);

  assertBeaconProxy(deploy.contracts.home!);
  const updaterManager = await deploy.contracts.home?.proxy.updaterManager();
  expect(updaterManager).to.equal(deploy.contracts.updaterManager?.address);

  assertBeaconProxy(deploy.contracts.governance!);

  replicaDomains.forEach(async domain => {
    assertBeaconProxy(deploy.contracts.replicas[domain]!);
    const registeredRouter = await deploy.contracts.governance?.proxy.routers(domain);
    expect(registeredRouter).to.not.equal(ethers.constants.AddressZero);
    const enrolledReplica = await deploy.contracts.xAppConnectionManager?.domainToReplica(domain);
    expect(enrolledReplica).to.not.equal(ethers.constants.AddressZero);
    deploy.config.watchers.forEach(async watcher => {
      const watcherPermissions = await deploy.contracts.xAppConnectionManager?.watcherPermission(watcher, domain);
      expect(watcherPermissions).to.be.true;
    });
  });

  expect(deploy.contracts.updaterManager).to.not.be.undefined;
  expect(deploy.contracts.upgradeBeaconController).to.not.be.undefined;
  expect(deploy.contracts.xAppConnectionManager).to.not.be.undefined;

  const gov = await deploy.contracts.governance?.proxy.governor();
  const localDomain = await deploy.contracts.home?.proxy.localDomain()
  if (governorDomain == localDomain) {
    expect(gov).to.not.equal(ethers.constants.AddressZero);
  } else {
    expect(gov).to.equal(ethers.constants.AddressZero);
  }
  expect(await deploy.contracts.governance?.proxy.governorDomain()).to.equal(governorDomain);

  const xAppManagerHome = await deploy.contracts.xAppConnectionManager?.home();
  const homeAddress = deploy.contracts.home?.proxy.address
  expect(xAppManagerHome).to.equal(homeAddress);

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
describe('DeployNChains', async () => {
  let deploys: Deploy[] = [];

  let signer: Signer,
    recoveryManager: Signer,
    updater: Updater;

  before(async () => {
    [signer, recoveryManager] = await ethers.getSigners();
    updater = await Updater.fromSigner(signer, domains[0]);

    // get fresh test deploy objects
    domains.forEach(async domain => {
      deploys.push(await getTestDeploy(domain, updater.address, [recoveryManager.address]))
    })
  });

  beforeEach(async () => {
    // deploy the entire Optics suite on each chain
    await deployNChains(deploys);
  });

  it('asserts all elements in deploy are defined', async () => {
    await deployCorrect(deploys[0], [domains[1], domains[2]], domains[0]);
    await deployCorrect(deploys[1], [domains[0], domains[2]], domains[0]);
    await deployCorrect(deploys[2], [domains[0], domains[1]], domains[0]);
  })
});

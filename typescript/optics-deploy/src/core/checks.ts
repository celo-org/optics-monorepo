import { expect } from 'chai';
import { Contract } from 'ethers';

import { CoreDeploy as Deploy } from './CoreDeploy';
import { BeaconProxy } from '../proxyUtils';

const emptyAddr = '0x' + '00'.repeat(20);

export function assertBeaconProxy(beaconProxy: BeaconProxy<Contract>) {
  expect(beaconProxy.beacon).to.not.be.undefined;
  expect(beaconProxy.proxy).to.not.be.undefined;
  expect(beaconProxy.implementation).to.not.be.undefined;
}

export async function checkCoreDeploy(
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
    expect(registeredRouter).to.not.equal(emptyAddr);
    // replica is enrolled in xAppConnectionManager
    const enrolledReplica = await deploy.contracts.xAppConnectionManager?.domainToReplica(domain);
    expect(enrolledReplica).to.not.equal(emptyAddr);
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
    expect(gov).to.not.equal(emptyAddr);
  } else {
    expect(gov).to.equal(emptyAddr);
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

  // check verification addresses
  // TODO: give unique name or id in verification output
  // expect(deploy.verificationInput[0].address).to.equal(deploy.contracts.upgradeBeaconController?.address);
  // expect(deploy.verificationInput[1].address).to.equal(deploy.contracts.updaterManager?.address);
  // expect(deploy.verificationInput[2].address).to.equal(deploy.contracts.xAppConnectionManager?.address);
  // expect(deploy.verificationInput[3].address).to.equal(deploy.contracts.home?.implementation.address);
  // expect(deploy.verificationInput[4].address).to.equal(deploy.contracts.home?.beacon.address);
  // expect(deploy.verificationInput[5].address).to.equal(deploy.contracts.home?.proxy.address);
  // expect(deploy.verificationInput[6].address).to.equal(deploy.contracts.governance?.implementation.address);
  // expect(deploy.verificationInput[7].address).to.equal(deploy.contracts.governance?.beacon.address);
  // expect(deploy.verificationInput[8].address).to.equal(deploy.contracts.governance?.proxy.address);
  // for (let i = 0; i < remoteDomains.length; i++) {
  //   const index = i + 9;
  //   const replica = deploy.contracts.replicas[remoteDomains[i]]!;
  //   expect(deploy.verificationInput[index].address).to.equal(replica.implementation.address);
  //   expect(deploy.verificationInput[index + 1].address).to.equal(replica.beacon.address);
  //   expect(deploy.verificationInput[index + 2].address).to.equal(replica.proxy.address);
  // }
}

import { expect } from 'chai';

import { assertBeaconProxy } from './core';
import { BridgeDeploy as Deploy } from '../bridge/BridgeDeploy';

const emptyAddr = '0x' + '00'.repeat(20);

export async function checkBridgeDeploy(
  deploy: Deploy | Deploy,
  remoteDomains?: number[],
) {
  console.log(deploy)

  assertBeaconProxy(deploy.contracts.bridgeToken!);
  assertBeaconProxy(deploy.contracts.bridgeRouter!);

  if (deploy.config.weth) {
    expect(deploy.contracts.ethHelper).to.not.be.undefined;
  } else {
    expect(deploy.contracts.ethHelper).to.be.undefined;
  }

  // remoteDomains.forEach(async (domain) => {
  //   const registeredRouter = await deploy.contracts.bridgeRouter?.proxy.remotes(domain);
  //   expect(registeredRouter).to.not.equal(emptyAddr);
  // })

  // expect(deploy.verificationInput[0].address).to.equal(deploy.contracts.bridgeToken?.implementation.address);
  // expect(deploy.verificationInput[1].address).to.equal(deploy.contracts.bridgeToken?.beacon.address);
  // expect(deploy.verificationInput[2].address).to.equal(deploy.contracts.bridgeToken?.proxy.address);
  // expect(deploy.verificationInput[3].address).to.equal(deploy.contracts.bridgeRouter?.implementation.address);
  // expect(deploy.verificationInput[4].address).to.equal(deploy.contracts.bridgeRouter?.beacon.address);
  // expect(deploy.verificationInput[5].address).to.equal(deploy.contracts.bridgeRouter?.proxy.address);
  // expect(deploy.verificationInput[6].address).to.equal(deploy.contracts.ethHelper?.address);
//   // Home upgrade setup contracts are defined
//   assertBeaconProxy(deploy.contracts.home!);

//   // updaterManager is set on Home
//   const updaterManager = await deploy.contracts.home?.proxy.updaterManager();
//   expect(updaterManager).to.equal(deploy.contracts.updaterManager?.address);

//   // GovernanceRouter upgrade setup contracts are defined
//   assertBeaconProxy(deploy.contracts.governance!);

//   remoteDomains.forEach(async domain => {
//     // Replica upgrade setup contracts are defined
//     assertBeaconProxy(deploy.contracts.replicas[domain]!);
//     // governanceRouter for remote domain is registered
//     const registeredRouter = await deploy.contracts.governance?.proxy.routers(domain);
//     expect(registeredRouter).to.not.equal(emptyAddr);
//     // replica is enrolled in xAppConnectionManager
//     const enrolledReplica = await deploy.contracts.xAppConnectionManager?.domainToReplica(domain);
//     expect(enrolledReplica).to.not.equal(emptyAddr);
//     //watchers have permission in xAppConnectionManager
//     deploy.config.watchers.forEach(async watcher => {
//       const watcherPermissions = await deploy.contracts.xAppConnectionManager?.watcherPermission(watcher, domain);
//       expect(watcherPermissions).to.be.true;
//     });
//   });

//   // contracts are defined
//   expect(deploy.contracts.updaterManager).to.not.be.undefined;
//   expect(deploy.contracts.upgradeBeaconController).to.not.be.undefined;
//   expect(deploy.contracts.xAppConnectionManager).to.not.be.undefined;

//   // governor is set on governor chain, empty on others
//   const gov = await deploy.contracts.governance?.proxy.governor();
//   const localDomain = await deploy.contracts.home?.proxy.localDomain()
//   if (governorDomain == localDomain) {
//     expect(gov).to.not.equal(emptyAddr);
//   } else {
//     expect(gov).to.equal(emptyAddr);
//   }
//   // governor domain is correct
//   expect(await deploy.contracts.governance?.proxy.governorDomain()).to.equal(governorDomain);

//   // Home is set on xAppConnectionManager
//   const xAppManagerHome = await deploy.contracts.xAppConnectionManager?.home();
//   const homeAddress = deploy.contracts.home?.proxy.address
//   expect(xAppManagerHome).to.equal(homeAddress);

//   // governor has ownership over following contracts
//   const updaterManagerOwner = await deploy.contracts.updaterManager?.owner();
//   const xAppManagerOwner = await deploy.contracts.xAppConnectionManager?.owner();
//   const beaconOwner = await deploy.contracts.upgradeBeaconController?.owner();
//   const homeOwner = await deploy.contracts.home?.proxy.owner();
//   const governorAddr = deploy.contracts.governance?.proxy.address;
//   expect(updaterManagerOwner).to.equal(governorAddr);
//   expect(xAppManagerOwner).to.equal(governorAddr);
//   expect(beaconOwner).to.equal(governorAddr);
//   expect(homeOwner).to.equal(governorAddr);
}
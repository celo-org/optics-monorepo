import { expect } from 'chai';
import { Contract, utils } from 'ethers';
import {Address, CoreDeploy as Deploy} from './CoreDeploy';
import { BridgeDeploy } from '../bridge/BridgeDeploy';
import { BeaconProxy } from '../proxyUtils';
import TestBridgeDeploy from '../bridge/TestBridgeDeploy';

function addressToBytes32(address: string) {
  return utils
      .hexZeroPad(utils.hexStripZeros(address), 32)
      .toLowerCase();
}

const emptyAddr = '0x' + '00'.repeat(20);

export function assertBeaconProxy(beaconProxy: BeaconProxy<Contract>) {
  expect(beaconProxy.beacon).to.not.be.undefined;
  expect(beaconProxy.proxy).to.not.be.undefined;
  expect(beaconProxy.implementation).to.not.be.undefined;
}

export function checkVerificationInput(
  deploy: Deploy | BridgeDeploy | TestBridgeDeploy,
  name: string,
  addr: string,
) {
  const inputAddr = deploy.verificationInput.filter(
    (contract) => contract.name == name,
  )[0].address;
  expect(inputAddr).to.equal(addr);
}

async function checkGovernor(deploy: Deploy, governorDomain: number, governorAddress: string) {
  if (deploy.chain.domain == governorDomain) {
    console.log(`   check that ${deploy.chain.name} IS configured as the governor chain`);
    // on the governor domain, the governor is local
    const govDomain = await deploy.contracts.governance?.proxy.governorDomain();
    const localDomain = await deploy.contracts.home?.proxy.localDomain();
    expect(localDomain).to.equal(deploy.chain.domain);
    expect(govDomain).to.equal(localDomain);
    expect(govDomain).to.equal(deploy.chain.domain);
    // the governor domain equals the expected domain
    expect(govDomain).to.equal(governorDomain);
    // the governor address equals the expected address
    const govAddress = await deploy.contracts.governance?.proxy.governor();
    expect(govAddress).to.equal(governorAddress);
    console.log(`   ✅`);
  } else {
    console.log(`   check that ${deploy.chain.name} IS NOT configured as governor chain / that governor IS properly configured`);
    // on the non-governor domains, the governor domain is remote
    const govDomain = await deploy.contracts.governance?.proxy.governorDomain();
    const localDomain = await deploy.contracts.home?.proxy.localDomain();
    expect(localDomain).to.equal(deploy.chain.domain);
    expect(govDomain).to.not.equal(localDomain);
    expect(govDomain).to.not.equal(deploy.chain.domain);
    // the governor domain equals the expected domain
    expect(govDomain).to.equal(governorDomain);
    // on the non-governor domains, the governor address is null address
    const govAddress = await deploy.contracts.governance?.proxy.governor();
    expect(govAddress).to.equal(emptyAddr);
    console.log(`   ✅`);
  }
}

async function checkRemoteIsEnrolled(deploy: Deploy, remoteDomain: number) {
  console.log(`   check that ${remoteDomain} GovernanceRouter IS enrolled on ${deploy.chain.name}`);
  // for each remote deploy, check that Replica and Governance are enrolled
  // governanceRouter for remote domain is registered
  const registeredRouter = await deploy.contracts.governance?.proxy.routers(remoteDomain);
  expect(registeredRouter).to.not.equal(addressToBytes32(emptyAddr));
  console.log(`   ✅`);
  console.log(`   check that ${remoteDomain} Replica IS enrolled on ${deploy.chain.name}`);
  // replica is enrolled in xAppConnectionManager
  const enrolledReplica =
      await deploy.contracts.xAppConnectionManager?.domainToReplica(remoteDomain);
  expect(enrolledReplica).to.not.equal(emptyAddr);
  console.log(`   ✅`);
}

async function checkSelfNotEnrolled(deploy: Deploy) {
  console.log(`   check that ${deploy.chain.name} GovernanceRouter IS NOT enrolled on itself`);
  // check that there is no enrolled contract for the local chain
  // governanceRouter for remote domain NOT registered
  const registeredRouter = await deploy.contracts.governance?.proxy.routers(
      deploy.chain.domain,
  );
  try {
    expect(registeredRouter).to.equal(addressToBytes32(emptyAddr));
    console.log(`   ✅`);
  } catch (e) {
    console.log(`   ❌`);
  }
  console.log(`   check that ${deploy.chain.name} Replica IS NOT enrolled on itself`);
  // replica is enrolled in NOT xAppConnectionManager
  const enrolledReplica =
      await deploy.contracts.xAppConnectionManager?.domainToReplica(deploy.chain.domain);
  expect(enrolledReplica).to.equal(emptyAddr);
  console.log(`   ✅`);
}

export async function checkGovernanceSystem(
    deploys: Deploy[],
    governorDomain: number,
    governorAddress: Address,
) {
  for (const deploy of deploys) {
    console.log(`Check ${deploy.chain.name}`);

    // ensure that the chain is not enrolled in itself
    await checkSelfNotEnrolled(deploy);

    for (const remoteDeploy of deploys) {
      if (deploy.chain.domain != remoteDeploy.chain.domain) {
        // for each remote chain,
        // check that remote GovernanceRouter is enrolled in local GovernanceRouter
        // and Replica is enrolled in xAppConnectionManager
        await checkRemoteIsEnrolled(deploy, remoteDeploy.chain.domain);
      }
    }

    // check that the chain has the governor configured properly
    await checkGovernor(deploy, governorDomain, governorAddress);
  }
}

export async function checkCoreDeploy(
  deploy: Deploy,
  remoteDomains: number[],
  governorDomain: number,
) {
  // Home upgrade setup contracts are defined
  assertBeaconProxy(deploy.contracts.home!);

  // ensure that the chain is not enrolled in itself
  await checkSelfNotEnrolled(deploy);

  // updaterManager is set on Home
  const updaterManager = await deploy.contracts.home?.proxy.updaterManager();
  expect(updaterManager).to.equal(deploy.contracts.updaterManager?.address);

  // GovernanceRouter upgrade setup contracts are defined
  assertBeaconProxy(deploy.contracts.governance!);

  for (const remoteDomain of remoteDomains) {
    // Replica upgrade setup contracts are defined
    assertBeaconProxy(deploy.contracts.replicas[remoteDomain]!);
    // check that remote GovernanceRouter is enrolled in local GovernanceRouter
    // and Replica is enrolled in xAppConnectionManager
    await checkRemoteIsEnrolled(deploy, remoteDomain);
    //watchers have permission in xAppConnectionManager
    deploy.config.watchers.forEach(async (watcher) => {
      const watcherPermissions =
        await deploy.contracts.xAppConnectionManager?.watcherPermission(
          watcher,
          remoteDomain,
        );
      expect(watcherPermissions).to.be.true;
    });
  }

  if (remoteDomains.length > 0) {
    // expect all replicas to have to same implementation and upgradeBeacon
    const firstReplica = deploy.contracts.replicas[remoteDomains[0]]!;
    const replicaImpl = firstReplica.implementation.address;
    const replicaBeacon = firstReplica.beacon.address;
    // check every other implementation/beacon matches the first
    remoteDomains.slice(1).forEach((remoteDomain) => {
      const replica = deploy.contracts.replicas[remoteDomain]!;
      const implementation = replica.implementation.address;
      const beacon = replica.beacon.address;
      expect(implementation).to.equal(replicaImpl);
      expect(beacon).to.equal(replicaBeacon);
    });
  }

  // contracts are defined
  expect(deploy.contracts.updaterManager).to.not.be.undefined;
  expect(deploy.contracts.upgradeBeaconController).to.not.be.undefined;
  expect(deploy.contracts.xAppConnectionManager).to.not.be.undefined;

  // governor is set on governor chain, empty on others
  let governorAddress;
  if (deploy.chain.domain == governorDomain) {
    governorAddress = deploy.config.governor!.address;
  } else {
    // won't be used if this is not the governor domain
    governorAddress = "0x123";
  }
  await checkGovernor(deploy, governorDomain, governorAddress);

  // Home is set on xAppConnectionManager
  const xAppManagerHome = await deploy.contracts.xAppConnectionManager?.home();
  const homeAddress = deploy.contracts.home?.proxy.address;
  expect(xAppManagerHome).to.equal(homeAddress);

  // governance has ownership over following contracts
  const updaterManagerOwner = await deploy.contracts.updaterManager?.owner();
  const xAppManagerOwner =
    await deploy.contracts.xAppConnectionManager?.owner();
  const beaconOwner = await deploy.contracts.upgradeBeaconController?.owner();
  const homeOwner = await deploy.contracts.home?.proxy.owner();
  const governorAddr = deploy.contracts.governance?.proxy.address;
  expect(updaterManagerOwner).to.equal(governorAddr);
  expect(xAppManagerOwner).to.equal(governorAddr);
  expect(beaconOwner).to.equal(governorAddr);
  expect(homeOwner).to.equal(governorAddr);

  // check verification addresses
  checkVerificationInput(
    deploy,
    'UpgradeBeaconController',
    deploy.contracts.upgradeBeaconController?.address!,
  );
  checkVerificationInput(
    deploy,
    'XAppConnectionManager',
    deploy.contracts.xAppConnectionManager?.address!,
  );
  checkVerificationInput(
    deploy,
    'UpdaterManager',
    deploy.contracts.updaterManager?.address!,
  );
  checkVerificationInput(
    deploy,
    'Home Implementation',
    deploy.contracts.home?.implementation.address!,
  );
  checkVerificationInput(
    deploy,
    'Home UpgradeBeacon',
    deploy.contracts.home?.beacon.address!,
  );
  checkVerificationInput(
    deploy,
    'Home Proxy',
    deploy.contracts.home?.proxy.address!,
  );
  checkVerificationInput(
    deploy,
    'Governance Implementation',
    deploy.contracts.governance?.implementation.address!,
  );
  checkVerificationInput(
    deploy,
    'Governance UpgradeBeacon',
    deploy.contracts.governance?.beacon.address!,
  );
  checkVerificationInput(
    deploy,
    'Governance Proxy',
    deploy.contracts.governance?.proxy.address!,
  );

  if (remoteDomains.length > 0) {
    checkVerificationInput(
      deploy,
      'Replica Implementation',
      deploy.contracts.replicas[remoteDomains[0]]?.implementation.address!,
    );
    checkVerificationInput(
      deploy,
      'Replica UpgradeBeacon',
      deploy.contracts.replicas[remoteDomains[0]]?.beacon.address!,
    );

    const replicaProxies = deploy.verificationInput.filter(
      (contract) => contract.name == 'Replica Proxy',
    );
    remoteDomains.forEach((domain) => {
      const replicaProxy = replicaProxies.find((proxy) => {
        return (proxy.address =
          deploy.contracts.replicas[domain]?.proxy.address);
      });
      expect(replicaProxy).to.not.be.undefined;
    });
  }
}

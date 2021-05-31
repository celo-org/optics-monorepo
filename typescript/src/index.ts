import * as ethers from 'ethers';
import * as contracts from './typechain';
import fs from 'fs';
import * as proxyUtils from './proxyUtils';
import { Deploy, toJson, toRustConfigs } from './chain';

function toBytes32(address: string): string {
  let addr = ethers.utils.getAddress(address);
  return '0x' + '00'.repeat(12) + address.slice(2);
}

async function deployUBC(deploy: Deploy) {
  let factory = new contracts.UpgradeBeaconController__factory(
    deploy.chain.deployer,
  );
  deploy.contracts.upgradeBeaconController = await factory.deploy({
    gasPrice: deploy.chain.gasPrice,
  });
  await deploy.contracts.upgradeBeaconController.deployTransaction.wait(5);
}

async function deployUpdaterManager(deploy: Deploy) {
  let factory = new contracts.UpdaterManager__factory(deploy.chain.deployer);
  deploy.contracts.updaterManager = await factory.deploy(deploy.chain.updater, {
    gasPrice: deploy.chain.gasPrice,
  });
  await deploy.contracts.updaterManager.deployTransaction.wait(5);
}

async function deployXappConnectionManager(deploy: Deploy) {
  let factory = new contracts.XAppConnectionManager__factory(
    deploy.chain.deployer,
  );
  deploy.contracts.xappConnectionManager = await factory.deploy({
    gasPrice: deploy.chain.gasPrice,
  });
  await deploy.contracts.xappConnectionManager.deployTransaction.wait(5);
}

async function deployHome(deploy: Deploy) {
  let { updaterManager } = deploy.contracts;
  let initData = contracts.Home__factory.createInterface().encodeFunctionData(
    'initialize',
    [updaterManager!.address],
  );

  const home = await proxyUtils.deployProxy<contracts.Home>(
    deploy,
    new contracts.Home__factory(deploy.chain.deployer),
    initData,
    deploy.chain.domain,
  );

  deploy.contracts.home = home;
}

async function deployGovernanceRouter(deploy: Deploy) {
  let { xappConnectionManager } = deploy.contracts;
  let initData =
    contracts.GovernanceRouter__factory.createInterface().encodeFunctionData(
      'initialize',
      [xappConnectionManager!.address],
    );

  const governance = await proxyUtils.deployProxy<contracts.GovernanceRouter>(
    deploy,
    new contracts.GovernanceRouter__factory(deploy.chain.deployer),
    initData,
    deploy.chain.domain,
  );

  deploy.contracts.governance = governance;
}

async function deployNewReplica(deploy: Deploy, other: Deploy) {
  console.log(
    `${deploy.chain.name}: deploying replica for domain ${other.chain.name}`,
  );
  const factory = new contracts.Replica__factory(deploy.chain.deployer);

  // Workaround because typechain doesn't handle overloads well, and Replica
  // has two public initializers
  const iface = contracts.Replica__factory.createInterface();
  const initIFace = new ethers.utils.Interface([
    iface.functions['initialize(uint32,address,bytes32,uint256,uint256)'],
  ]);

  const initData = initIFace.encodeFunctionData('initialize', [
    other.chain.domain,
    other.chain.updater,
    ethers.constants.HashZero, // TODO: allow configuration
    other.chain.optimisticSeconds,
    0, // TODO: allow configuration
  ]);

  // if we have no replicas, deploy the whole setup.
  // otherwise just deploy a fresh proxy
  let proxy;
  if (Object.keys(deploy.contracts.replicas).length === 0) {
    console.log(`${deploy.chain.name}: initial Replica deploy`);
    proxy = await proxyUtils.deployProxy<contracts.Replica>(
      deploy,
      factory,
      initData,
      deploy.chain.domain,
    );
  } else {
    console.log(`${deploy.chain.name}: additional Replica deploy`);
    const prev = Object.entries(deploy.contracts.replicas)[0][1];
    proxy = await proxyUtils.duplicate<contracts.Replica>(
      deploy,
      prev,
      initData,
    );
  }
  deploy.contracts.replicas[other.chain.domain] = proxy;
  console.log(`${deploy.chain.name}: replica deployed for ${other.chain.name}`);
}

export async function deploy(deploy: Deploy) {
  console.log(`${deploy.chain.name}: awaiting deploy UBC(deploy);`);
  await deployUBC(deploy);

  console.log(`${deploy.chain.name}: awaiting deploy UpdaterManager(deploy);`);
  await deployUpdaterManager(deploy);

  console.log(
    `${deploy.chain.name}: awaiting deploy XappConnectionManager(deploy);`,
  );
  await deployXappConnectionManager(deploy);

  console.log(`${deploy.chain.name}: awaiting deploy Home(deploy);`);
  await deployHome(deploy);

  console.log(
    `${deploy.chain.name}: awaiting xappConnectionManager.setHome(...);`,
  );
  await deploy.contracts.xappConnectionManager!.setHome(
    deploy.contracts.home!.proxy.address,
    { gasPrice: deploy.chain.gasPrice },
  );

  console.log(`${deploy.chain.name}: awaiting updaterManager.setHome(...);`);
  await deploy.contracts.updaterManager!.setHome(
    deploy.contracts.home!.proxy.address,
    { gasPrice: deploy.chain.gasPrice },
  );

  console.log(
    `${deploy.chain.name}: awaiting deploy GovernanceRouter(deploy);`,
  );
  await deployGovernanceRouter(deploy);

  console.log(`${deploy.chain.name}: initial chain deploy completed`);
}

export async function relinquish(deploy: Deploy) {
  console.log(`${deploy.chain.name}: Relinquishing control`);
  await deploy.contracts.updaterManager!.transferOwnership(
    deploy.contracts.governance!.proxy.address,
    { gasPrice: deploy.chain.gasPrice },
  );

  console.log(`${deploy.chain.name}: Dispatched relinquish updatermanager`);

  await deploy.contracts.xappConnectionManager!.transferOwnership(
    deploy.contracts.governance!.proxy.address,
    { gasPrice: deploy.chain.gasPrice },
  );

  console.log(
    `${deploy.chain.name}: Dispatched relinquish xappConnectionManager`,
  );

  await deploy.contracts.upgradeBeaconController!.transferOwnership(
    deploy.contracts.governance!.proxy.address,
    { gasPrice: deploy.chain.gasPrice },
  );

  console.log(
    `${deploy.chain.name}: Dispatched relinquish upgradeBeaconController`,
  );

  let tx = await deploy.contracts.home!.proxy.transferOwnership(
    deploy.contracts.governance!.proxy.address,
    { gasPrice: deploy.chain.gasPrice },
  );

  console.log(`${deploy.chain.name}: Dispatched relinquish home`);

  await tx.wait(5);
  console.log(`${deploy.chain.name}: Control relinquished`);
}

export async function enrollReplica(left: Deploy, right: Deploy) {
  console.log(`${left.chain.name}: starting replica enrollment`);

  let tx = await left.contracts.xappConnectionManager!.ownerEnrollReplica(
    left.contracts.replicas[right.chain.domain].proxy.address,
    right.chain.domain,
    { gasPrice: left.chain.gasPrice },
  );
  await tx.wait(5);

  console.log(`${left.chain.name}: replica enrollment done`);
}

export async function enrollWatchers(left: Deploy, right: Deploy) {
  console.log(`${left.chain.name}: starting watcher enrollment`);

  await Promise.all(
    left.chain.watchers.map(async (watcher) => {
      const tx =
        await left.contracts.xappConnectionManager!.setWatcherPermission(
          watcher,
          right.chain.domain,
          true,
          { gasPrice: left.chain.gasPrice },
        );
      await tx.wait(5);
    }),
  );

  console.log(`${left.chain.name}: watcher enrollment done`);
}

export async function enrollGovernanceRouter(left: Deploy, right: Deploy) {
  console.log(`${left.chain.name}: starting governance enrollment`);
  let tx = await left.contracts.governance!.proxy.setRouter(
    right.chain.domain,
    toBytes32(right.contracts.governance!.proxy.address),
    { gasPrice: left.chain.gasPrice },
  );
  await tx.wait(5);
  console.log(`${left.chain.name}: governance enrollment done`);
}

export async function transferGovernorship(gov: Deploy, non: Deploy) {
  console.log(`${non.chain.name}: transferring governorship`);
  let governorAddress = await gov.contracts.governance!.proxy.governor();
  let tx = await non.contracts.governance!.proxy.transferGovernor(
    gov.chain.domain,
    governorAddress,
    { gasPrice: non.chain.gasPrice },
  );
  await tx.wait(5);
  console.log(`${non.chain.name}: governorship transferred`);
}

// gov has the governance capability after setup
export async function deployTwoChains(gov: Deploy, non: Deploy) {
  await Promise.all([deploy(gov), deploy(non)]);

  console.log('initial deploys done');

  await Promise.all([deployNewReplica(gov, non), deployNewReplica(non, gov)]);

  console.log('replica deploys done');

  await Promise.all([enrollReplica(gov, non), enrollReplica(non, gov)]);

  console.log('replica enrollment done');

  await Promise.all([enrollWatchers(gov, non), enrollWatchers(non, gov)]);

  await Promise.all([
    enrollGovernanceRouter(gov, non),
    enrollGovernanceRouter(non, gov),
  ]);

  await transferGovernorship(gov, non);

  await Promise.all([relinquish(gov), relinquish(non)]);

  writeTwoChainOutput(gov, non);
}

// Deploys a hub and spoke system
export async function deployHubAndSpokes(gov: Deploy, spokes: Deploy[]) {
  await deploy(gov);

  for (const non of spokes) {
    await deploy(non);
    await deployNewReplica(gov, non);
    await deployNewReplica(non, gov);

    await enrollReplica(gov, non);
    await enrollReplica(non, gov);

    await enrollWatchers(gov, non);
    await enrollWatchers(non, gov);

    await enrollGovernanceRouter(gov, non);
    await enrollGovernanceRouter(non, gov);

    await transferGovernorship(gov, non);

    await relinquish(non);
  }

  await relinquish(gov);
}

export function writeTwoChainOutput(left: Deploy, right: Deploy) {
  let [a, g] = toRustConfigs(left, right);

  let lName = left.chain.name;
  let rName = right.chain.name;

  let dir = `../config/${Date.now()}-${left.chain.name}-${right.chain.name}`;
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(`${dir}/${lName}_config.json`, JSON.stringify(a, null, 2));
  fs.writeFileSync(`${dir}/${rName}_config.json`, JSON.stringify(g, null, 2));
  fs.writeFileSync(`${dir}/${lName}_contracts.json`, toJson(left.contracts));
  fs.writeFileSync(`${dir}/${rName}_contracts.json`, toJson(right.contracts));
}

// TODO: fix ts errors here
// @ts-nocheck

import * as ethers from 'ethers';
import * as contracts from '../../typechain/optics-core';
import fs from 'fs';
import * as proxyUtils from './proxyUtils';
import { Deploy, toJson, buildConfig } from './chain';
import { toBytes32 } from '../../optics-tests/lib/utils';

export async function deployUpgradeBeaconController(deploy: Deploy) {
  let factory = new contracts.UpgradeBeaconController__factory(
    deploy.chain.deployer,
  );
  deploy.contracts.upgradeBeaconController = await factory.deploy();
  deploy.contracts.upgradeBeaconController = await factory.deploy({
    gasPrice: deploy.chain.gasPrice,
  });
  await deploy.contracts.upgradeBeaconController.deployTransaction.wait(deploy.chain.confirmations);
}

/**
 * Deploys the UpdaterManager on the chain of the given deploy and updates
 * the deploy instance with the new contract.
 *
 * @param deploy - The deploy instance
 */
export async function deployUpdaterManager(deploy: Deploy) {
  let factory = new contracts.UpdaterManager__factory(deploy.chain.deployer);
  deploy.contracts.updaterManager = await factory.deploy(deploy.chain.updater);
  deploy.contracts.updaterManager = await factory.deploy(deploy.chain.updater, {
    gasPrice: deploy.chain.gasPrice,
  });
  await deploy.contracts.updaterManager.deployTransaction.wait(deploy.chain.confirmations);
}

/**
 * Deploys the XAppConnectionManager on the chain of the given deploy and updates
 * the deploy instance with the new contract.
 *
 * @param deploy - The deploy instance
 */
export async function deployXAppConnectionManager(deploy: Deploy) {
  let factory = new contracts.XAppConnectionManager__factory(
    deploy.chain.deployer,
  );
  deploy.contracts.xappConnectionManager = await factory.deploy({
    gasPrice: deploy.chain.gasPrice,
  });
  await deploy.contracts.xappConnectionManager.deployTransaction.wait(deploy.chain.confirmations);
}

/**
 * Deploys the Home proxy on the chain of the given deploy and updates
 * the deploy instance with the new contract.
 *
 * @param deploy - The deploy instance
 * @param isTestDeploy - True to deploy the test contract
 */
export async function devDeployHome(deploy: Deploy, isTestDeploy: boolean) {
  const home = isTestDeploy
    ? contracts.TestHome__factory
    : contracts.Home__factory;
  let { updaterManager } = deploy.contracts;
  let initData = home
    .createInterface()
    .encodeFunctionData('initialize', [updaterManager!.address]);

  deploy.contracts.home = await proxyUtils.deployProxy<contracts.Home>(
    deploy,
    new home(deploy.chain.deployer),
    initData,
    deploy.chain.domain,
  );
}

/**
 * Deploys the GovernanceRouter proxy on the chain of the given deploy and updates
 * the deploy instance with the new contract.
 *
 * @param deploy - The deploy instance
 * @param isTestDeploy - True to deploy the test contract
 */
export async function devDeployGovernanceRouter(
  deploy: Deploy,
  isTestDeploy: boolean,
) {
  const governanceRouter = isTestDeploy
    ? contracts.TestGovernanceRouter__factory
    : contracts.GovernanceRouter__factory;
  let { xappConnectionManager } = deploy.contracts;
  let initData = governanceRouter
    .createInterface()
    .encodeFunctionData('initialize', [xappConnectionManager!.address]);

  deploy.contracts.governance =
    await proxyUtils.deployProxy<contracts.GovernanceRouter>(
      deploy,
      new governanceRouter(deploy.chain.deployer),
      initData,
      deploy.chain.domain,
    );
}

/**
 * Deploys a Replica proxy on the local chain and updates the local deploy
 * instance with the new contract.
 *
 * @param local - The local deploy instance
 * @param remote - The remote deploy instance
 * @param isTestDeploy - True to deploy the test contract
 */
export async function devDeployNewReplica(
  local: Deploy,
  remote: Deploy,
  isTestDeploy: boolean,
) {
  console.log(
    `${local.chain.name}: deploying replica for domain ${remote.chain.name}`,
  );
  const replica = isTestDeploy
    ? contracts.TestReplica__factory
    : contracts.Replica__factory;
  const factory = new replica(local.chain.deployer);

  // Workaround because typechain doesn't handle overloads well, and Replica
  // has two public initializers
  const iface = replica.createInterface();
  const initIFace = new ethers.utils.Interface([
    iface.functions['initialize(uint32,address,bytes32,uint256,uint256)'],
  ]);

  const initData = initIFace.encodeFunctionData('initialize', [
    remote.chain.domain,
    remote.chain.updater,
    ethers.constants.HashZero, // TODO: allow configuration
    remote.chain.optimisticSeconds,
    0, // TODO: allow configuration
  ]);

  // if we have no replicas, deploy the whole setup.
  // otherwise just deploy a fresh proxy
  let proxy;
  if (Object.keys(local.contracts.replicas).length === 0) {
    console.log(`${local.chain.name}: initial Replica deploy`);
    proxy = await proxyUtils.deployProxy<contracts.Replica>(
      local,
      factory,
      initData,
      local.chain.domain,
    );
  } else {
    console.log(`${local.chain.name}: additional Replica deploy`);
    const prev = Object.entries(local.contracts.replicas)[0][1];
    proxy = await proxyUtils.duplicate<contracts.Replica>(
      local,
      prev,
      initData,
    );
  }
  local.contracts.replicas[remote.chain.domain] = proxy;
  console.log(`${local.chain.name}: replica deployed for ${remote.chain.name}`);
}

/**
 * Deploys the entire optics suite of contracts on the chain of the given deploy
 * and updates the deploy instance with the new contracts.
 *
 * @param deploy - The deploy instance
 * @param isTestDeploy - True to deploy the test contract
 */
export async function devDeployOptics(deploy: Deploy, isTestDeploy: boolean) {
  console.log(`${deploy.chain.name}: awaiting deploy UBC(deploy);`);
  await deployUpgradeBeaconController(deploy);

  console.log(`${deploy.chain.name}: awaiting deploy UpdaterManager(deploy);`);
  await deployUpdaterManager(deploy);

  console.log(
    `${deploy.chain.name}: awaiting deploy XappConnectionManager(deploy);`,
  );
  await deployXAppConnectionManager(deploy);

  console.log(`${deploy.chain.name}: awaiting deploy Home(deploy);`);
  await devDeployHome(deploy, isTestDeploy);

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
  await devDeployGovernanceRouter(deploy, isTestDeploy);

  console.log(`${deploy.chain.name}: initial chain deploy completed`);
}

/**
 * Transfers ownership to the GovernanceRouter.
 *
 * @param deploy - The deploy instance
 */
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

  await tx.wait(deploy.chain.confirmations);
  console.log(`${deploy.chain.name}: Control relinquished`);
}

/**
 * Enrolls a remote replica on the local chain.
 *
 * @param local - The local deploy instance
 * @param remote - The remote deploy instance
 */
export async function enrollReplica(local: Deploy, remote: Deploy) {
  console.log(`${local.chain.name}: starting replica enrollment`);

  let tx = await local.contracts.xappConnectionManager!.ownerEnrollReplica(
    local.contracts.replicas[remote.chain.domain].proxy.address,
    remote.chain.domain,
    { gasPrice: local.chain.gasPrice },
  );
  await tx.wait(local.chain.confirmations);

  console.log(`${local.chain.name}: replica enrollment done`);
}

/**
 * Enrolls a remote watcher on the local chain.
 *
 * @param local - The local deploy instance
 * @param remote - The remote deploy instance
 */
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
      await tx.wait(deploy.chain.confirmations);
    }),
  );

  console.log(`${left.chain.name}: watcher enrollment done`);
}

/**
 * Enrolls a remote GovernanceRouter on the local chain.
 *
 * @param local - The local deploy instance
 * @param remote - The remote deploy instance
 */
export async function enrollGovernanceRouter(local: Deploy, remote: Deploy) {
  console.log(`${local.chain.name}: starting governance enrollment`);
  let tx = await local.contracts.governance!.proxy.setRouter(
    remote.chain.domain,
    toBytes32(remote.contracts.governance!.proxy.address),
    { gasPrice: local.chain.gasPrice },
  );
  await tx.wait(deploy.chain.confirmations);
  console.log(`${local.chain.name}: governance enrollment done`);
}

/**
 * Enrolls a remote Replica, GovernanceRouter and Watchers on the local chain.
 *
 * @param local - The local deploy instance
 * @param remote - The remote deploy instance
 * @param isTestDeploy - True to deploy the test contract
 */
export async function devEnrollRemote(
  local: Deploy,
  remote: Deploy,
  isTestDeploy: boolean,
) {
  await devDeployNewReplica(local, remote, isTestDeploy);
  await enrollReplica(local, remote);
  await enrollWatchers(local, remote);
  await enrollGovernanceRouter(local, remote);
}

/**
 * Transfers governorship to the Governor Router.
 *
 * @param gov - The governor chain deploy instance
 * @param non - The non-governor chain deploy instance
 */
export async function transferGovernorship(gov: Deploy, non: Deploy) {
  console.log(`${non.chain.name}: transferring governorship`);
  let governorAddress = await gov.contracts.governance!.proxy.governor();
  let tx = await non.contracts.governance!.proxy.transferGovernor(
    gov.chain.domain,
    governorAddress,
    { gasPrice: non.chain.gasPrice },
  );
  await tx.wait(deploy.chain.confirmations);
  console.log(`${non.chain.name}: governorship transferred`);
}

/**
 * Deploys the entire optics suite of contracts on two chains.
 *
 * @notice `gov` has the governance capability after setup
 *
 * @param gov - The governor chain deploy instance
 * @param non - The non-governor chain deploy instance
 */
export async function devDeployTwoChains(
  gov: Deploy,
  non: Deploy,
  isTestDeploy: boolean,
) {
  await Promise.all([
    devDeployOptics(gov, isTestDeploy),
    devDeployOptics(non, isTestDeploy),
  ]);

  console.log('initial deploys done');

  await Promise.all([
    devDeployNewReplica(gov, non, isTestDeploy),
    devDeployNewReplica(non, gov, isTestDeploy),
  ]);

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

  writeDeployOutput([gov, non]);
}

/**
 * Deploys a hub and spoke system (the governance chain is connected to any
 * number of replica chains, but they are not connected to each other).
 *
 * @param gov - The governing chain deploy instance
 * @param spokes - An array of remote chain deploy instances
 */
export async function devDeployHubAndSpokes(
  gov: Deploy,
  spokes: Deploy[],
  isTestDeploy: boolean,
) {
  await devDeployOptics(gov, isTestDeploy);

  for (const non of spokes) {
    await devDeployOptics(non, isTestDeploy);

    await devEnrollRemote(gov, non, isTestDeploy);
    await devEnrollRemote(non, gov, isTestDeploy);

    await transferGovernorship(gov, non);

    await relinquish(non);
  }

  await relinquish(gov);
}

/**
 * Deploy the entire suite of Optics contracts
 * on each chain within the chainConfigs array
 * including the upgradable Home, Replicas, and GovernanceRouter
 * that have been deployed, initialized, and configured
 * according to the deployOptics script
 *
 * @dev The first chain in the sequence will be the governing chain
 *
 * @param chains - An array of chain deploys
 */
export async function devDeployNChains(
  chains: Deploy[],
  isTestDeploy: boolean,
) {
  const govChain = chains[0];
  const nonGovChains = chains.slice(1);
  await devDeployHubAndSpokes(govChain, nonGovChains, isTestDeploy);
  for (let local of nonGovChains) {
    for (let remote of nonGovChains) {
      if (remote.chain.domain != local.chain.domain) {
        console.log(
          `enrolling ${remote.chain.domain} on ${local.chain.domain}`,
        );
        await devEnrollRemote(local, remote, isTestDeploy);
      }
    }
  }

  writeDeployOutput(chains);
}

/**
 * Outputs the values for chains that have been deployed.
 *
 * @param deploys - The array of chain deploys
 */
export function writeDeployOutput(deploys: Deploy[]) {
  console.log(`Have ${deploys.length} deploys`);
  const dir = `../rust/config/${Date.now()}`;
  for (const local of deploys) {
    // get remotes
    const remotes = deploys
      .slice()
      .filter((remote) => remote.chain.domain !== local.chain.domain);

    const config = buildConfig(local, remotes);
    const name = local.chain.name;

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      `${dir}/${name}_config.json`,
      JSON.stringify(config, null, 2),
    );
    fs.writeFileSync(`${dir}/${name}_contracts.json`, toJson(local.contracts));
  }
}

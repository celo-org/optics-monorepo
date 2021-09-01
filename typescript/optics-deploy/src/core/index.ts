import * as ethers from 'ethers';
import fs from 'fs';

import * as proxyUtils from '../proxyUtils';
import { CoreDeploy } from './CoreDeploy';
import { toBytes32 } from '../../../optics-tests/lib/utils';
import * as contracts from '../../../typechain/optics-core';

function log(isTest: boolean, str: string) {
  if (!isTest) {
    console.log(str);
  }
}

function warn(text: string, padded: boolean = false) {
  if (padded) {
    const padding = '*'.repeat(text.length + 8);
    console.log(
      `
      ${padding}
      *** ${text.toUpperCase()} ***
      ${padding}
      `,
    );
  } else {
    console.log(`**** ${text.toUpperCase()} ****`);
  }
}

export async function deployUpgradeBeaconController(deploy: CoreDeploy) {
  let factory = new contracts.UpgradeBeaconController__factory(deploy.deployer);
  deploy.contracts.upgradeBeaconController = await factory.deploy(
    deploy.overrides,
  );
  await deploy.contracts.upgradeBeaconController.deployTransaction.wait(
    deploy.chain.confirmations,
  );

  // add contract information to Etherscan verification array
  deploy.verificationInput.push({
    name: 'UpgradeBeaconController',
    address: deploy.contracts.upgradeBeaconController.address,
    constructorArguments: [],
  });
}

/**
 * Deploys the UpdaterManager on the chain of the given deploy and updates
 * the deploy instance with the new contract.
 *
 * @param deploy - The deploy instance
 */
export async function deployUpdaterManager(deploy: CoreDeploy) {
  let factory = new contracts.UpdaterManager__factory(deploy.deployer);
  deploy.contracts.updaterManager = await factory.deploy(
    deploy.config.updater,
    deploy.overrides,
  );
  await deploy.contracts.updaterManager.deployTransaction.wait(
    deploy.chain.confirmations,
  );

  // add contract information to Etherscan verification array
  deploy.verificationInput.push({
    name: 'UpdaterManager',
    address: deploy.contracts.updaterManager!.address,
    constructorArguments: [deploy.config.updater],
  });
}

/**
 * Deploys the XAppConnectionManager on the chain of the given deploy and updates
 * the deploy instance with the new contract.
 *
 * @param deploy - The deploy instance
 */
export async function deployXAppConnectionManager(deploy: CoreDeploy) {
  const isTestDeploy: boolean = deploy.test;
  if (isTestDeploy) warn('deploying test XAppConnectionManager');

  const deployer = deploy.deployer;
  const factory = isTestDeploy
    ? new contracts.TestXAppConnectionManager__factory(deployer)
    : new contracts.XAppConnectionManager__factory(deployer);

  deploy.contracts.xAppConnectionManager = await factory.deploy(
    deploy.overrides,
  );
  await deploy.contracts.xAppConnectionManager.deployTransaction.wait(
    deploy.chain.confirmations,
  );

  // add contract information to Etherscan verification array
  deploy.verificationInput.push({
    name: 'XAppConnectionManager',
    address: deploy.contracts.xAppConnectionManager!.address,
    constructorArguments: [],
  });
}

/**
 * Deploys the Home proxy on the chain of the given deploy and updates
 * the deploy instance with the new contract.
 *
 * @param deploy - The deploy instance
 */
export async function deployHome(deploy: CoreDeploy) {
  const isTestDeploy: boolean = deploy.test;
  if (isTestDeploy) warn('deploying test Home');
  const homeFactory = isTestDeploy
    ? contracts.TestHome__factory
    : contracts.Home__factory;

  let { updaterManager } = deploy.contracts;
  let initData = homeFactory
    .createInterface()
    .encodeFunctionData('initialize', [updaterManager!.address]);

  deploy.contracts.home = await proxyUtils.deployProxy<contracts.Home>(
    deploy,
    new homeFactory(deploy.deployer),
    initData,
    deploy.chain.domain,
  );
}

/**
 * Deploys the GovernanceRouter proxy on the chain of the given deploy and updates
 * the deploy instance with the new contract.
 *
 * @param deploy - The deploy instance
 */
export async function deployGovernanceRouter(deploy: CoreDeploy) {
  const isTestDeploy: boolean = deploy.test;
  if (isTestDeploy) warn('deploying test GovernanceRouter');
  const governanceRouter = isTestDeploy
    ? contracts.TestGovernanceRouter__factory
    : contracts.GovernanceRouter__factory;

  let { xAppConnectionManager } = deploy.contracts;
  const recoveryManager = deploy.config.recoveryManager;
  const recoveryTimelock = 1;

  let initData = governanceRouter
    .createInterface()
    .encodeFunctionData('initialize', [
      xAppConnectionManager!.address,
      recoveryManager,
    ]);

  deploy.contracts.governance =
    await proxyUtils.deployProxy<contracts.GovernanceRouter>(
      deploy,
      new governanceRouter(deploy.deployer),
      initData,
      deploy.chain.domain,
      recoveryTimelock,
    );
}

/**
 * Deploys an unenrolled Replica proxy on the local chain and updates the local
 * deploy instance with the new contract.
 *
 * @param local - The local deploy instance
 * @param remote - The remote deploy instance
 */
export async function deployUnenrolledReplica(
  local: CoreDeploy,
  remote: CoreDeploy,
) {
  const isTestDeploy: boolean = remote.test;
  if (isTestDeploy) warn('deploying test Replica');
  log(
    isTestDeploy,
    `${local.chain.name}: deploying replica for domain ${remote.chain.name}`,
  );

  const replica = isTestDeploy
    ? contracts.TestReplica__factory
    : contracts.Replica__factory;
  const factory = new replica(local.chain.deployer);

  let initData = replica.createInterface().encodeFunctionData('initialize', [
    remote.chain.domain,
    remote.config.updater,
    ethers.constants.HashZero, // TODO: allow configuration
    remote.config.optimisticSeconds,
  ]);

  // if we have no replicas, deploy the whole setup.
  // otherwise just deploy a fresh proxy
  let proxy;
  if (Object.keys(local.contracts.replicas).length === 0) {
    log(isTestDeploy, `${local.chain.name}: initial Replica deploy`);
    proxy = await proxyUtils.deployProxy<contracts.Replica>(
      local,
      new replica(local.deployer),
      initData,
      local.chain.domain,
    );
  } else {
    log(isTestDeploy, `${local.chain.name}: additional Replica deploy`);
    const prev = Object.entries(local.contracts.replicas)[0][1];
    proxy = await proxyUtils.duplicate<contracts.Replica>(
      local,
      prev,
      initData,
    );
  }
  local.contracts.replicas[remote.chain.domain] = proxy;
  log(
    isTestDeploy,
    `${local.chain.name}: replica deployed for ${remote.chain.name}`,
  );
}

/**
 * Deploys the entire optics suite of contracts on the chain of the given deploy
 * and updates the deploy instance with the new contracts.
 *
 * @param deploy - The deploy instance
 */
export async function deployOptics(deploy: CoreDeploy) {
  const isTestDeploy: boolean = deploy.test;
  if (isTestDeploy) {
    warn('deploying test contracts', true);
  }

  log(isTestDeploy, `${deploy.chain.name}: awaiting deploy UBC(deploy);`);
  await deployUpgradeBeaconController(deploy);

  log(
    isTestDeploy,
    `${deploy.chain.name}: awaiting deploy UpdaterManager(deploy);`,
  );
  await deployUpdaterManager(deploy);

  log(
    isTestDeploy,
    `${deploy.chain.name}: awaiting deploy XappConnectionManager(deploy);`,
  );
  await deployXAppConnectionManager(deploy);

  log(isTestDeploy, `${deploy.chain.name}: awaiting deploy Home(deploy);`);
  await deployHome(deploy);

  log(
    isTestDeploy,
    `${deploy.chain.name}: awaiting XAppConnectionManager.setHome(...);`,
  );
  await deploy.contracts.xAppConnectionManager!.setHome(
    deploy.contracts.home!.proxy.address,
    deploy.overrides,
  );

  log(
    isTestDeploy,
    `${deploy.chain.name}: awaiting updaterManager.setHome(...);`,
  );
  await deploy.contracts.updaterManager!.setHome(
    deploy.contracts.home!.proxy.address,
    deploy.overrides,
  );

  log(
    isTestDeploy,
    `${deploy.chain.name}: awaiting deploy GovernanceRouter(deploy);`,
  );
  await deployGovernanceRouter(deploy);

  log(isTestDeploy, `${deploy.chain.name}: initial chain deploy completed`);
}

/**
 * Transfers ownership to the GovernanceRouter.
 *
 * @param deploy - The deploy instance
 */
export async function relinquish(deploy: CoreDeploy) {
  const isTestDeploy = deploy.test;
  const govRouter = await deploy.contracts.governance!.proxy.address;

  log(isTestDeploy, `${deploy.chain.name}: Relinquishing control`);
  await deploy.contracts.updaterManager!.transferOwnership(
    govRouter,
    deploy.overrides,
  );

  log(
    isTestDeploy,
    `${deploy.chain.name}: Dispatched relinquish updatermanager`,
  );

  await deploy.contracts.xAppConnectionManager!.transferOwnership(
    govRouter,
    deploy.overrides,
  );

  log(
    isTestDeploy,
    `${deploy.chain.name}: Dispatched relinquish XAppConnectionManager`,
  );

  await deploy.contracts.upgradeBeaconController!.transferOwnership(
    govRouter,
    deploy.overrides,
  );

  log(
    isTestDeploy,
    `${deploy.chain.name}: Dispatched relinquish upgradeBeaconController`,
  );

  let tx = await deploy.contracts.home!.proxy.transferOwnership(
    govRouter,
    deploy.overrides,
  );

  log(isTestDeploy, `${deploy.chain.name}: Dispatched relinquish home`);

  await tx.wait(deploy.chain.confirmations);
  log(isTestDeploy, `${deploy.chain.name}: Control relinquished`);
}

/**
 * Enrolls a remote replica on the local chain.
 *
 * @param local - The local deploy instance
 * @param remote - The remote deploy instance
 */
export async function enrollReplica(local: CoreDeploy, remote: CoreDeploy) {
  const isTestDeploy = local.test;
  log(isTestDeploy, `${local.chain.name}: starting replica enrollment`);

  let tx = await local.contracts.xAppConnectionManager!.ownerEnrollReplica(
    local.contracts.replicas[remote.chain.domain].proxy.address,
    remote.chain.domain,
    local.overrides,
  );
  await tx.wait(local.chain.confirmations);

  log(isTestDeploy, `${local.chain.name}: replica enrollment done`);
}

/**
 * Enrolls a remote watcher on the local chain.
 *
 * @param local - The local deploy instance
 * @param remote - The remote deploy instance
 */
export async function enrollWatchers(left: CoreDeploy, right: CoreDeploy) {
  const isTestDeploy = left.test;
  log(isTestDeploy, `${left.chain.name}: starting watcher enrollment`);

  await Promise.all(
    left.config.watchers.map(async (watcher) => {
      const tx =
        await left.contracts.xAppConnectionManager!.setWatcherPermission(
          watcher,
          right.chain.domain,
          true,
          left.overrides,
        );
      await tx.wait(left.chain.confirmations);
    }),
  );

  log(isTestDeploy, `${left.chain.name}: watcher enrollment done`);
}

/**
 * Enrolls a remote GovernanceRouter on the local chain.
 *
 * @param local - The local deploy instance
 * @param remote - The remote deploy instance
 */
export async function enrollGovernanceRouter(
  local: CoreDeploy,
  remote: CoreDeploy,
) {
  const isTestDeploy = local.test;
  log(
    isTestDeploy,
    `${local.chain.name}: starting enroll ${remote.chain.name} governance router`,
  );
  let tx = await local.contracts.governance!.proxy.setRouter(
    remote.chain.domain,
    toBytes32(remote.contracts.governance!.proxy.address),
    local.overrides,
  );
  await tx.wait(local.chain.confirmations);
  log(
    isTestDeploy,
    `${local.chain.name}: enrolled ${remote.chain.name} governance router`,
  );
}

/**
 * Enrolls a remote Replica, GovernanceRouter and Watchers on the local chain.
 *
 * @param local - The local deploy instance
 * @param remote - The remote deploy instance
 */
export async function enrollRemote(local: CoreDeploy, remote: CoreDeploy) {
  await deployUnenrolledReplica(local, remote);
  await enrollReplica(local, remote);
  await enrollWatchers(local, remote);
  await enrollGovernanceRouter(local, remote);
}

/**
 * Transfers governorship to the governing chain's GovernanceRouter.
 *
 * @param gov - The governor chain deploy instance
 * @param non - The non-governor chain deploy instance
 */
export async function transferGovernorship(gov: CoreDeploy, non: CoreDeploy) {
  const isTestDeploy = gov.test;
  log(isTestDeploy, `${non.chain.name}: transferring governorship`);
  let governorAddress = await gov.contracts.governance!.proxy.governor();
  let tx = await non.contracts.governance!.proxy.transferGovernor(
    gov.chain.domain,
    governorAddress,
    non.overrides,
  );
  await tx.wait(gov.chain.confirmations);
  log(isTestDeploy, `${non.chain.name}: governorship transferred`);
}

/**
 * Appints the intended ultimate governor in that domain's Governance Router.
 * If the governor address is not configured, it will remain the deployer
 * address.
 * @param gov - The governor chain deploy instance
 */
export async function appointGovernor(gov: CoreDeploy) {
  let governor = gov.config.governor;
  if (governor) {
    log(
      gov.test,
      `${gov.chain.name}: transferring root governorship to ${governor}`,
    );
    const tx = await gov.contracts.governance!.proxy.transferGovernor(
      governor.domain,
      governor.address,
    );
    await tx.wait(gov.chain.confirmations);
    log(gov.test, `${gov.chain.name}: root governorship transferred`);
  }
}

/**
 * Deploys the entire optics suite of contracts on two chains.
 *
 * @notice `gov` has the governance capability after setup
 *
 * @param gov - The governor chain deploy instance
 * @param non - The non-governor chain deploy instance
 */
export async function deployTwoChains(gov: CoreDeploy, non: CoreDeploy) {
  console.log('Beginning Two Chain deploy process');
  console.log(`Deploy env is ${gov.config.environment}`);
  console.log(`${gov.chain.name} is governing`);
  console.log(`Updater for ${gov.chain.name} Home is ${gov.config.updater}`);
  console.log(`Updater for ${non.chain.name} Home is ${non.config.updater}`);

  const isTestDeploy: boolean = gov.test || non.test;

  console.log('awaiting provider ready');
  await Promise.all([gov.ready(), non.ready()]);
  console.log('done readying');

  await Promise.all([deployOptics(gov), deployOptics(non)]);

  log(isTestDeploy, 'initial deploys done');

  await Promise.all([
    deployUnenrolledReplica(gov, non),
    deployUnenrolledReplica(non, gov),
  ]);

  log(isTestDeploy, 'replica deploys done');

  await Promise.all([enrollReplica(gov, non), enrollReplica(non, gov)]);

  log(isTestDeploy, 'replica enrollment done');

  await Promise.all([enrollWatchers(gov, non), enrollWatchers(non, gov)]);

  await Promise.all([
    enrollGovernanceRouter(gov, non),
    enrollGovernanceRouter(non, gov),
  ]);

  await transferGovernorship(gov, non);

  await Promise.all([relinquish(gov), relinquish(non)]);

  if (gov.config.governor) {
    await appointGovernor(gov);
  }

  if (!isTestDeploy) {
    writeDeployOutput([gov, non]);
  }
}

/**
 * Deploys a hub and spoke system (the governance chain is connected to any
 * number of replica chains, but they are not connected to each other).
 *
 * @param gov - The governing chain deploy instance
 * @param spokes - An array of remote chain deploy instances
 */
async function deployHubAndSpokes(gov: CoreDeploy, spokes: CoreDeploy[]) {
  await deployOptics(gov);

  await Promise.all(
    spokes.map(async (non) => {
      await deployOptics(non);
      await enrollRemote(gov, non);
      await enrollRemote(non, gov);
    }),
  );
}

/**
 * Deploy the entire suite of Optics contracts
 * on each chain within the chainConfigs array
 * including the upgradable Home, Replicas, and GovernanceRouter
 * that have been deployed, initialized, and configured
 * according to the deployOptics script
 *
 * @dev The first chain in the array will be the governing chain
 *
 * @param deploys - An array of chain deploys
 */
export async function deployNChains(deploys: CoreDeploy[]) {
  console.log(`Beginning ${deploys.length} Chain deploy process`);
  console.log(`Deploy env is ${deploys[0].config.environment}`);
  console.log(`${deploys[0].chain.name} is governing`);
  deploys.forEach((deploy) => {
    console.log(
      `Updater for ${deploy.chain.name} Home is ${deploy.config.updater}`,
    );
  });

  // there exists any chain marked test
  const isTestDeploy: boolean = deploys.filter((c) => c.test).length > 0;
  const govChain = deploys[0];
  const nonGovChains = deploys.slice(1);

  // ensure providers are connected
  console.log('awaiting provider ready');
  await Promise.all(deploys.map(async (deploy) => await deploy.ready()));
  console.log('done readying');

  // enroll all spokes with the governance chain
  await deployHubAndSpokes(govChain, nonGovChains);

  // enroll all spokes with eachother
  await Promise.all(
    nonGovChains.map(async (local) => {
      // deploy replicas for all OTHER non-gov domains
      // (gov replicas were already deployed in hubAndSpokes)
      await Promise.all(
        nonGovChains
          .filter((deploy) => deploy.chain.domain !== local.chain.domain)
          .map(async (remote) => {
            log(
              isTestDeploy,
              `connecting ${remote.chain.name} on ${local.chain.name}`,
            );
            await enrollRemote(local, remote);
            log(
              isTestDeploy,
              `connected ${remote.chain.name} on ${local.chain.name}`,
            );
          }),
      );
    }),
  );

  // appoint the configured governance account as governor
  if (govChain.config.governor) {
    await appointGovernor(govChain);
  }

  await Promise.all(
    nonGovChains.map(async (non) => {
      await transferGovernorship(govChain, non);
    }),
  );

  // relinquish control of all chains
  await Promise.all(deploys.map(relinquish));

  // write config outputs
  if (!isTestDeploy) {
    writeDeployOutput(deploys);
  }
}

/**
 * Copies the partial configs from the default directory to the specified directory.
 *
 * @param dir - relative path to folder where partial configs will be written
 */
export function writePartials(dir: string) {
  // make folder if it doesn't exist already
  fs.mkdirSync(dir, { recursive: true });
  const defaultDir = '../../rust/config/default';
  const partialNames = ['kathy', 'processor', 'relayer', 'updater', 'watcher'];
  // copy partial config from default directory to given directory
  for (let partialName of partialNames) {
    const filename = `${partialName}-partial.json`;
    fs.copyFile(`${defaultDir}/${filename}`, `${dir}/${filename}`, (err) => {
      if (err) {
        console.error(err);
      }
    });
  }
}

/**
 * Outputs the values for chains that have been deployed.
 *
 * @param deploys - The array of chain deploys
 */
export function writeDeployOutput(deploys: CoreDeploy[]) {
  log(deploys[0].test, `Have ${deploys.length} deploys`);
  const dir = `../../rust/config/${Date.now()}`;
  for (const local of deploys) {
    // get remotes
    const remotes = deploys
      .slice()
      .filter((remote) => remote.chain.domain !== local.chain.domain);

    const config = CoreDeploy.buildConfig(local, remotes);
    const name = local.chain.name;

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      `${dir}/${name}_config.json`,
      JSON.stringify(config, null, 2),
    );
    fs.writeFileSync(
      `${dir}/${name}_contracts.json`,
      JSON.stringify(local.contractOutput, null, 2),
    );
    fs.writeFileSync(
      `${dir}/${name}_verification.json`,
      JSON.stringify(local.verificationInput, null, 2),
    );
  }
  writePartials(dir);
}

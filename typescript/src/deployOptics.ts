import * as ethers from 'ethers';
import * as contracts from './typechain/optics-core';
import fs from 'fs';
import * as proxyUtils from './proxyUtils';
import { Deploy, toJson, toRustConfigs } from './chain';
import { toBytes32 } from './lib/utils';

export async function deployUpgradeBeaconController(deploy: Deploy) {
  let factory = new contracts.UpgradeBeaconController__factory(
    deploy.chain.deployer,
  );
  deploy.contracts.upgradeBeaconController = await factory.deploy({
    gasPrice: deploy.chain.gasPrice,
  });
  await deploy.contracts.upgradeBeaconController.deployTransaction.wait(5);

  // add contract information to Etherscan verification array
  deploy.verificationInput.push({
    name: 'UpgradeBeaconController',
    address: deploy.contracts.upgradeBeaconController!.address,
    constructorArguments: [],
  });
}

/**
 * Deploys the UpdaterManager on the chain of the given deploy and updates
 * the deploy instance with the new contract.
 *
 * @param deploy - The deploy instance
 */
export async function deployUpdaterManager(deploy: Deploy) {
  let factory = new contracts.UpdaterManager__factory(deploy.chain.deployer);
  deploy.contracts.updaterManager = await factory.deploy(deploy.chain.updater, {
    gasPrice: deploy.chain.gasPrice,
  });
  await deploy.contracts.updaterManager.deployTransaction.wait(5);

  // add contract information to Etherscan verification array
  deploy.verificationInput.push({
    name: 'UpdaterManager',
    address: deploy.contracts.updaterManager!.address,
    constructorArguments: [deploy.chain.updater],
  });
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
  await deploy.contracts.xappConnectionManager.deployTransaction.wait(5);

  // add contract information to Etherscan verification array
  deploy.verificationInput.push({
    name: 'XAppConnectionManager',
    address: deploy.contracts.xappConnectionManager!.address,
    constructorArguments: [],
  });
}

/**
 * Deploys the Home proxy on the chain of the given deploy and updates
 * the deploy instance with the new contract.
 *
 * @param deploy - The deploy instance
 */
async function deployHome(deploy: Deploy) {
  await devDeployHome(deploy, false);
}

/**
 * Deploys the GovernanceRouter proxy on the chain of the given deploy and updates
 * the deploy instance with the new contract.
 *
 * @param deploy - The deploy instance
 */
export async function deployGovernanceRouter(deploy: Deploy) {
  let { xappConnectionManager } = deploy.contracts;
  let initData =
    contracts.GovernanceRouter__factory.createInterface().encodeFunctionData(
      'initialize',
      [xappConnectionManager!.address, recoveryManager],
    );

  const governance = await proxyUtils.deployProxy<contracts.GovernanceRouter>(
    deploy,
    new contracts.GovernanceRouter__factory(deploy.chain.deployer),
    initData,
    deploy.chain.domain,
    recoveryTimelock,
  );

  deploy.contracts.governance = governance;
}

/**
 * Deploys a Replica proxy on the local chain and updates the local deploy
 * instance with the new contract.
 *
 * @param local - The local deploy instance
 * @param remote - The remote deploy instance
 */
async function deployNewReplica(local: Deploy, remote: Deploy) {
  await devDeployNewReplica(local, remote, false);
}

/**
 * Enrolls a remote Replica, GovernanceRouter and Watchers on the local chain.
 *
 * @param local - The local deploy instance
 * @param remote - The remote deploy instance
 */
async function enrollRemote(local: Deploy, remote: Deploy) {
  await devEnrollRemote(local, remote, false);
}

/**
 * Deploys the entire optics suite of contracts on the chain of the given deploy
 * and updates the deploy instance with the new contracts.
 *
 * @param deploy - The deploy instance
 */
async function deployOptics(deploy: Deploy) {
  await devDeployOptics(deploy, false);
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
export async function deployNChains(chains: Deploy[]) {
  const govChain = chains[0];
  const nonGovChains = chains.slice(1);
  await deployHubAndSpokes(govChain, nonGovChains);
  for (let local of nonGovChains) {
    for (let remote of nonGovChains) {
      if (remote.chain.domain != local.chain.domain) {
        console.log(
          `enrolling ${remote.chain.domain} on ${local.chain.domain}`,
        );
        await enrollRemote(local, remote);
      }
    }
  }

  writeDeployOutput(chains);
}

/**
 * Copies the partial configs from the default directory to the specified directory.
 *
 * @param dir - relative path to folder where partial configs will be written
 */
export function writePartials(dir: string) {
  // make folder if it doesn't exist already
  fs.mkdirSync(dir, { recursive: true });
  const defaultDir = '../rust/config/default';
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
    fs.writeFileSync(
      `${dir}/${name}_verification.json`,
      JSON.stringify(local.verificationInput, null, 2),
    );
  }
  writePartials(dir);
}

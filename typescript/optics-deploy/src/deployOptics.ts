import { Deploy } from './chain';
import {
  devDeployHome,
  devDeployGovernanceRouter,
  devDeployNewReplica,
  devEnrollRemote,
  devDeployOptics,
  devDeployNChains,
  deployUpgradeBeaconController,
  deployUpdaterManager,
  deployXAppConnectionManager,
  transferGovernorship,
  relinquish,
  writeDeployOutput,
} from './devDeployOptics';

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
  const defaultDir = "../rust/config/default";
  const partialNames = ["kathy", "processor", "relayer", "updater", "watcher"];
  // copy partial config from default directory to given directory
  for (let partialName of partialNames) {
    const filename = `${partialName}-partial.json`;
    fs.copyFile( `${defaultDir}/${filename}`, `${dir}/${filename}`, (err) => {
      if(err) {
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
  }
  writePartials(dir);
}

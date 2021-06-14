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
async function deployGovernanceRouter(deploy: Deploy) {
  await devDeployGovernanceRouter(deploy, false);
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
async function deployNChains(chains: Deploy[]) {
  await devDeployNChains(chains, false);
}

export {
  deployUpgradeBeaconController,
  deployUpdaterManager,
  deployXAppConnectionManager,
  transferGovernorship,
  relinquish,
  writeDeployOutput,
  deployHome,
  deployGovernanceRouter,
  deployNewReplica,
  enrollRemote,
  deployOptics,
  deployNChains,
};

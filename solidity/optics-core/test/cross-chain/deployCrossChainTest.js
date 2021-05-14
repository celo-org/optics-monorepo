const { devDeployOptics } = require('../../scripts/deployOpticsUtils');

/*
 * Get the Home contract for the given domain
 *
 * @param chainDetails - ChainDetails type
 * @param domain - domain where the Home contract is deployed; localDomain for the Home
 *
 * @return homeContract - ethers contract for interacting with the Home
 */
function getHome(chainDetails, domain) {
  return chainDetails[domain].contracts.home.proxyWithImplementation;
}

/*
 * Get the Replica contract that's deployed on replicaDomain (localDomain = replicaDomain)
 * that listens to homeDomain (remoteDomain = homeDomain)
 *
 * @param chainDetails - ChainDetails type
 * @param replicaDomain - localDomain for the Replica; domain where the Replica contract is deployed
 * @param homeDomain - remoteDomain for the Replica; domain of the Home contract the Replica "listens" to
 *
 * @return replicaContract - ethers contract for interacting with the Replica
 */
function getReplica(chainDetails, replicaDomain, homeDomain) {
  return chainDetails[replicaDomain].contracts.replicaProxies[homeDomain]
    .proxyWithImplementation;
}

/*
 * Get the Updater object that can sign updates for the given domain
 *
 * @param chainDetails - ChainDetails type
 * @param domain - domain of the chain for which we want the Updater
 *
 * @return updaterObject - an optics.Updater type
 */
function getUpdaterObject(chainDetails, domain) {
  return chainDetails[domain].updaterObject;
}

/*
 * Get the GovernanceRouter contract
 *
 * @param chainDetails - ChainDetails type
 * @param domain - the domain
 * @return governanceRouterContract - ethers contract for interacting with the upgradeBeacon
 */
function getGovernanceRouter(chainDetails, domain) {
  return chainDetails[domain].contracts.governanceRouter
    .proxyWithImplementation;
}

/*
 * Get the UpgradeBeaconController contract
 *
 * @param chainDetails - ChainDetails type
 * @param domain - the domain
 * @return upgradeBeaconControllerContract - ethers contract for interacting with the upgradeBeaconController
 */
function getUpgradeBeaconController(chainDetails, domain) {
  return chainDetails[domain].contracts.upgradeBeaconController;
}

/*
 * Get the UpdaterManager contract
 *
 * @param chainDetails - ChainDetails type
 * @param domain - the domain
 * @return updaterManagerContract - ethers contract for interacting with the updaterManager
 */
function getUpdaterManager(chainDetails, domain) {
  return chainDetails[domain].contracts.updaterManager;
}

/*
 * Deploy the entire suite of Optics contracts
 * on each chain within the chainConfigs array
 * including the upgradable Home, Replicas, and GovernanceRouter
 * that have been deployed, initialized, and configured
 * according to the deployOptics script
 *
 * @param chainConfigs - ChainConfig[]
 *
 * @return chainDetails - ChainDetails type
 */
async function deployMultipleChains(chainConfigs) {
  // for each domain, deploy the entire contract suite,
  // including one replica for each other domain
  const chainDetails = {};

  for (let config of chainConfigs) {
    const { domain } = config;

    // for the given domain,
    // local is the single chainConfig for the chain at the given domain
    // remotes is an array of all other chains
    const { local, remotes } = separateLocalFromRemotes(chainConfigs, domain);

    // deploy contract suite for this chain
    // note: we will be working with a persistent set of contracts across each test
    const contracts = await devDeployOptics(local, remotes, true);

    chainDetails[domain] = {
      ...config,
      contracts,
    };
  }

  return chainDetails;
}

/*
 * Given a full array of chainConfigs and a target localDomain,
 * return an object where local is the domain specified by localDomain
 * and remotes is an array of all other remote domains
 * thus creating appropriate input parameters for the deployOptics script
 * given an array of all Optics chains
 *
 * @param chainConfigs - ChainConfig[]
 * @param localDomain - domain for the local contract suite
 *
 * @return {
 *    local - ChainConfig for the local domain
 *    remotes - ChainConfig[] for all other domains
 * }
 */
function separateLocalFromRemotes(chainConfigs, localDomain) {
  let local;
  const remotes = [];

  for (let config of chainConfigs) {
    if (config.domain == localDomain) {
      local = config;
    } else {
      remotes.push(config);
    }
  }

  return {
    local,
    remotes,
  };
}

module.exports = {
  deployMultipleChains,
  getHome,
  getReplica,
  getGovernanceRouter,
  getUpdaterObject,
  getUpgradeBeaconController,
  getUpdaterManager,
};

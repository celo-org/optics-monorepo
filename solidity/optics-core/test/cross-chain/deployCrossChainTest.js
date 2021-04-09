function getHome(chainDetails, domain) {
  return chainDetails[domain].contracts.home.proxyWithImplementation;
}

function getReplica(chainDetails, replicaDomain, homeDomain) {
  return chainDetails[replicaDomain].contracts.replicaProxies[homeDomain]
    .proxyWithImplementation;
}

function getUpdaterObject(chainDetails, domain) {
  return chainDetails[domain].updaterObject;
}

/*
 * Deploy Optics contract setup across multiple chains
 *
 * @param configs - array of ChainConfigs;
 * the entire Optics setup will be deployed once
 * for each domain in the configs array
 * */
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
    const contracts = await optics.deployOptics(local, remotes);

    chainDetails[domain] = {
      ...config,
      contracts,
    };
  }

  return chainDetails;
}

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
  getUpdaterObject,
};

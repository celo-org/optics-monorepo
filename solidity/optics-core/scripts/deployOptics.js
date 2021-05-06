const utils = require('./deployOpticsUtils');

// TODO: #later explore bundling these deploys into a single transaction to a bespoke DeployHelper contract
/*
 * Deploy, initialize, and configure the entire
 * suite of Optics contracts for a single chain
 * specified by the config information
 *
 * @param local - a single ChainConfig for the local chain
 * @param remotes - an array of ChainConfigs for each of the remote chains
 *
 * @return contracts - OpticsContracts type for the suite of Optics contract on this chain
 */
async function deployOptics(local, remotes) {
  return utils.devDeployOptics(local, remotes, false);
}

module.exports = {
  deployOptics,
};

const { ethers } = require('hardhat');

/*
 * Given an array of domains,
 * generate an array of ChainConfigs
 * which can be used to deploy Optics to each domain
 * for cross-chain tests
 *
 * @param domains - array of domains (integers) for chains we want to deploy Optics on
 *
 * @return configs - TestChainConfig[]
 */
async function domainsToTestConfigs(domains) {
  let configs = domains.map((domain) => {
    return {
      domain,
      currentRoot:
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      lastProcessedIndex: 0,
      optimisticSeconds: 3,
    };
  });

  const signers = await ethers.getSigners();

  if (signers.length < domains.length) {
    throw new Error('need more signers to add updaters for all chains');
  }

  // add the domain + updater + initialization arguments to config
  for (let i = 0; i < configs.length; i++) {
    let config = configs[i];
    const { domain } = config;

    const signer = signers[i];

    const updaterObject = await optics.Updater.fromSigner(signer, domain);

    configs[i] = {
      ...config,
      updater: signer.address,
      updaterObject,
      signer,
    };
  }

  return configs;
}

module.exports = {
  domainsToTestConfigs,
};

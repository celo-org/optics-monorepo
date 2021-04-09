const { waffle } = require('hardhat');
const { provider } = waffle;

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

  const wallets = provider.getWallets();

  if (wallets.length < domains.length) {
    throw new Error('need more wallets to add updaters for all chains');
  }

  // add the domain + updater + initialization arguments to config
  for (let i = 0; i < configs.length; i++) {
    let config = configs[i];
    const { domain } = config;

    const signer = wallets[i];

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

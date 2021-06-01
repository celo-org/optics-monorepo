const { types, task } = require('hardhat/config');
const utils = require('./utils.js');

task('deploy-home', 'Deploy an upgradable home.')
  .addParam('domain', 'The origin chain domain ID', undefined, types.int)
  .addParam(
    'updaterManager',
    'The updater identity handler',
    undefined,
    types.string,
  )
  .setAction(async (args, hre) => {
    const { ethers, optics } = hre;
    const { domain, updaterManager } = args;
    const updaterManagerAddr = ethers.utils.getAddress(updaterManager);
    const { contracts } = await optics.deployProxyWithImplementation(
      'Home',
      [domain],
      [updaterManagerAddr],
    );

    const { implementation, controller, upgradeBeacon, proxy } = contracts;
    console.log(
      `Deployed Home at ${implementation.address} with domain ${domain}.\n`,
      `Deployed Controller at ${controller.address}.\n`,
      `Deployed UpgradeBeacon at ${upgradeBeacon.address}.\n`,
      `Deployed Proxy at ${proxy.address}.\n`,
    );
  });

task('deploy-replica', 'Deploy an upgradable replica.')
  .addParam('origin', 'The origin chain domain ID', undefined, types.int)
  .addParam(
    'destination',
    'The destination chain domain ID',
    undefined,
    types.int,
  )
  .addParam('updater', 'The address of the updater', undefined, types.string)
  .addParam(
    'current',
    'The current root to init with',
    `0x${'00'.repeat(32)}`,
    types.string,
  )
  .addParam(
    'wait',
    'The optimistic wait period in seconds',
    60 * 60 * 2, // 2 hours
    types.int,
  )
  .addParam(
    'nextToProcess',
    'Index of next message to process',
    undefined,
    types.int,
  )
  .setAction(async (args, hre) => {
    const { ethers, optics } = hre;
    const { origin, destination, updater, current, wait, nextToProcess } = args;
    const updaterAddr = ethers.utils.getAddress(updater);
    if (!ethers.utils.isHexString(current, 32)) {
      throw new Error('current must be a 32-byte 0x prefixed hex string');
    }

    const { contracts } = await optics.deployProxyWithImplementation(
      'Replica',
      [origin],
      [destination, updaterAddr, current, wait, nextToProcess],
    );

    const { implementation, controller, upgradeBeacon, proxy } = contracts;
    console.log(
      `Deployed Replica at ${implementation.address} with domain ${destination}.\n`,
      `Deployed Controller at ${controller.address}.\n`,
      `Deployed UpgradeBeacon at ${upgradeBeacon.address}.\n`,
      `Deployed Proxy at ${proxy.address}.\n`,
    );
  });

task('deploy-test-home', 'Deploy a home with a fake updaterManager for testing')
  .addParam('domain', 'The origin chain domain ID', undefined, types.int)
  .setAction(async (args, hre) => {
    let { ethers } = hre;
    let [signer] = await ethers.getSigners();
    let signerAddress = await signer.getAddress();

    console.log(`Deploying from ${signerAddress}`);
    let UpdaterManager = await ethers.getContractFactory('UpdaterManager');
    let updaterManager = await UpdaterManager.deploy(signerAddress);
    await updaterManager.deployed();
    console.log(`Deployed new UpdaterManager at ${updaterManager.address}`);

    let home = await hre.run('deploy-home', {
      domain: args.domain,
      updaterManager: updaterManager.address,
    });
  });

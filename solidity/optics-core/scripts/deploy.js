const { types, task } = require('hardhat/config');
const utils = require('./utils.js');

task('deploy-home', 'Deploy a home.')
  .addParam('domain', 'The origin chain domain ID', undefined, types.int)
  .addParam(
    'sortition',
    'The updater identity handler',
    undefined,
    types.string,
  )
  .setAction(async (args, hre) => {
    const { ethers, optics } = hre;
    let address = ethers.utils.getAddress(args.sortition);
    let [signer] = await ethers.getSigners();
    let home = await optics.deployHome(signer, args.domain, address);
    console.log(
      `Deployed new Home at ${home.address} with domain ${args.domain}`,
    );
  });

task('deploy-replica', 'Deploy a replica.')
  .addParam('origin', 'The origin chain domain ID', undefined, types.int)
  .addParam(
    'destination',
    'The destination chain domain ID',
    undefined,
    types.int,
  )
  .addParam('updater', 'The address of the updater', undefined, types.string)
  .addOptionalParam(
    'wait',
    'The optimistic wait period in seconds',
    60 * 60 * 2, // 2 hours
    types.int,
  )
  .addOptionalParam(
    'current',
    'The current root to init with',
    `0x${'00'.repeat(32)}`,
    types.string,
  )
  .addOptionalParam(
    'lastProcessed',
    'The last processed message sequence',
    0,
    types.int,
  )
  .setAction(async (args, hre) => {
    const { ethers, optics } = hre;
    let updater = ethers.utils.getAddress(args.updater);
    if (!ethers.utils.isHexString(args.current, 32)) {
      throw new Error('current must be a 32-byte 0x prefixed hex string');
    }

    let [signer] = await ethers.getSigners();

    await optics.deployReplica(
      signer,
      args.origin,
      args.destination,
      updater,
      args.wait,
      args.current,
      args.lastProcessed,
    );
  });

task('deploy-test-home', 'Deploy a home with a fake sortition for testing')
  .addParam('domain', 'The origin chain domain ID', undefined, types.int)
  .setAction(async (args, hre) => {
    let { ethers } = hre;
    let [signer] = await ethers.getSigners();
    let signerAddress = await signer.getAddress();

    console.log(`Deploying from ${signerAddress}`);
    let Sortition = await ethers.getContractFactory('TestSortition');
    let sortition = await Sortition.deploy(signerAddress);
    await sortition.deployed();
    console.log(`Deployed new TestSortition at ${sortition.address}`);

    let home = await hre.run('deploy-home', {
      domain: args.domain,
      sortition: sortition.address,
    });
  });

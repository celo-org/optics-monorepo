const { types, task } = require('hardhat/config');
const utils = require('./utils.js');

task('deploy-home', 'Deploy a home.')
  .addParam('slip44', 'The origin chain SLIP44 ID', undefined, types.int)
  .addParam(
    'sortition',
    'The updater identity handler',
    undefined,
    types.string,
  )
  .setAction(async (args) => {
    let address = ethers.utils.getAddress(args.sortition);
    let signer = ethers.getSigner();
    let home = await optics.deployHome(signer, args.slip44, address);
    console.log(home.address);
  });

task('deploy-replica', 'Deploy a replica.')
  .addParam('origin', 'The origin chain SLIP44 ID', undefined, types.int)
  .addParam(
    'destination',
    'The destination chain SLIP44 ID',
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
  .setAction(async (args) => {
    let updater = ethers.utils.getAddress(args.updater);
    if (!ethers.utils.isHexString(args.current, 32)) {
      throw new Error('current must be a 32-byte 0x prefixed hex string');
    }

    let signer = ethers.getSigner();

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

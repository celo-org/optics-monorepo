const { types, task } = require('hardhat/config');
const utils = require('./utils.js');

task('submit-update', 'Submit an update to a home or replica contract.')
  .addParam(
    'address',
    'The address of the contract to update.',
    undefined,
    types.string,
  )
  .addParam('oldRoot', 'The old root', undefined, types.string)
  .addParam('newRoot', 'The new root', undefined, types.string)
  .addParam('signature', 'The updater signature', undefined, types.string)
  .setAction(async (args) => {
    let address = ethers.utils.getAddress(args.address);
    let { newRoot, oldRoot, signature } = args;
    let update = await utils.validateUpdate(newRoot, oldRoot, signature);

    let [signer] = await ethers.getSigners();

    // we should be able to use home for either. Consider moving this to common?
    let contract = new optics.Home(address, signer);
    let tx = await contract.submitSignedUpdate({ oldRoot, newRoot, signature });
    await utils.reportTxOutcome(tx);
  });

task('submit-double-update', 'Submit a double update to a home or replica.')
  .addParam(
    'address',
    'The address of the contract to update.',
    undefined,
    types.string,
  )
  .addParam('oldRoot1', 'The old root', undefined, types.string)
  .addParam('newRoot1', 'The new root', undefined, types.string)
  .addParam('signature1', 'The updater signature', undefined, types.string)
  .addParam('oldRoot2', 'The old root', undefined, types.string)
  .addParam('newRoot2', 'The new root', undefined, types.string)
  .addParam('signature2', 'The updater signature', undefined, types.string)
  .setAction(async (args) => {
    let { oldRoot1, newRoot1, signature1, oldRoot2, newRoot2, signature2 } =
      args;

    let address = ethers.utils.getAddress(args.address);
    let update1 = await utils.validateUpdate(newRoot1, oldRoot1, signature1);
    let update2 = await utils.validateUpdate(newRoot2, oldRoot2, signature2);

    let [signer] = await ethers.getSigners();

    let contract = new optics.Common(address, signer);
    let tx = await contract.submitDoubleUpdate(update1, update2);
    await utils.reportTxOutcome(tx);
  });

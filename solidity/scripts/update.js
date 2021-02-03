const { ethers } = require('ethers');
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
    let { newRoot, oldRoot, signature } = args;
    let address = ethers.utils.getAddress(args.address);

    if (!ethers.utils.isHexString(oldRoot, 32)) {
      throw new Error('oldRoot must be a 32-byte 0x prefixed hex string');
    }
    if (!ethers.utils.isHexString(newRoot, 32)) {
      throw new Error('newRoot must be a 32-byte 0x prefixed hex string');
    }
    if (!ethers.utils.isHexString(signature, 65)) {
      throw new Error('signature must be a 65-byte 0x prefixed hex string');
    }

    let signer = await ethers.getSigner();

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
    let {
      oldRoot1,
      newRoot1,
      signature1,
      oldRoot2,
      newRoot2,
      signature2,
    } = args;
    let address = ethers.utils.getAddress(args.address);

    if (!ethers.utils.isHexString(oldRoot1, 32)) {
      throw new Error('oldRoot must be a 32-byte 0x prefixed hex string');
    }
    if (!ethers.utils.isHexString(newRoot1, 32)) {
      throw new Error('newRoot must be a 32-byte 0x prefixed hex string');
    }
    if (!ethers.utils.isHexString(signature1, 65)) {
      throw new Error('signature must be a 65-byte 0x prefixed hex string');
    }
    if (!ethers.utils.isHexString(oldRoot2, 32)) {
      throw new Error('oldRoot must be a 32-byte 0x prefixed hex string');
    }
    if (!ethers.utils.isHexString(newRoot2, 32)) {
      throw new Error('newRoot must be a 32-byte 0x prefixed hex string');
    }
    if (!ethers.utils.isHexString(signature2, 65)) {
      throw new Error('signature must be a 65-byte 0x prefixed hex string');
    }

    let signer = await ethers.getSigner();

    let contract = new optics.Common(address, signer);
    let tx = await contract.submitDoubleUpdate(
      { oldRoot: oldRoot1, newRoot: newRoot1, signature: signature1 },
      { oldRoot: oldRoot2, newRoot: newRoot2, signature: signature2 },
    );
    await utils.reportTxOutcome(tx);
  });

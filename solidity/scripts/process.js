const ethers = require('ethers');
const { types, task } = require('hardhat/config');
const utils = require('./utils.js');

task('prove', 'Prove a message inclusion to a replica')
  .addParam(
    'address',
    'The address of the contract to update.',
    undefined,
    types.string,
  )
  .addParam('message', 'The message to prove.', undefined, types.string)
  .addParam(
    'proof',
    'The 32 * 32 byte proof as a single hex string',
    undefined,
    types.string,
  )
  .addParam(
    'index',
    'The index of the message in the merkle tree',
    undefined,
    types.int,
  )
  .setAction(async (args) => {
    let address = ethers.utils.getAddress(args.address);
    let { rawProof, message, index } = args;
    let proof = utils.parseProof(rawProof);

    if (!ethers.utils.isHexString(message)) {
      throw new Error('newRoot must be a 0x prefixed hex string');
    }

    let signer = await ethers.getSigner();
    let replica = new optics.Replica(address, signer);

    // preflight
    if (
      await replica.callStatic.prove(
        ethers.utils.keccak256(message),
        proof,
        index,
      )
    ) {
      let tx = await replica.prove(
        ethers.utils.keccak256(message),
        proof,
        index,
      );
      await utils.reportTxOutcome(tx);
    } else {
      console.log('Error: Replica will reject proof');
    }
  });

task('process', 'Process a message that has been proven to a replica')
  .addParam(
    'address',
    'The address of the contract to update.',
    undefined,
    types.string,
  )
  .addParam('message', 'The message to prove.', undefined, types.string)
  .setAction(async (args) => {
    let address = ethers.utils.getAddress(args.address);
    let { message } = args;
    if (!ethers.utils.isHexString(message)) {
      throw new Error('newRoot must be a 0x prefixed hex string');
    }

    let signer = await ethers.getSigner();
    let replica = new optics.Replica(address, signer);

    try {
      await replica.callStatic.process(message);
      let tx = await replica.process(message);
      await utils.reportTxOutcome(tx);
    } catch (e) {
      console.log(
        `Error: Replica will reject process with message\n\t${e.message}`,
      );
    }
  });

task('prove-and-process', 'Prove and process a message')
  .addParam(
    'address',
    'The address of the contract to update.',
    undefined,
    types.string,
  )
  .addParam('message', 'The message to prove.', undefined, types.string)
  .addParam(
    'proof',
    'The 32 * 32 byte proof as a single hex string',
    undefined,
    types.string,
  )
  .addParam(
    'index',
    'The index of the message in the merkle tree',
    undefined,
    types.int,
  )
  .setAction(async (args) => {
    let address = ethers.utils.getAddress(args.address);
    let { rawProof, message, index } = args;
    let proof = utils.parseProof(rawProof);

    if (!ethers.utils.isHexString(message)) {
      throw new Error('newRoot must be a 0x prefixed hex string');
    }

    let signer = await ethers.getSigner();
    let replica = new optics.Replica(address, signer);

    try {
      await replica.callStatic.proveAndProcess(
        ethers.utils.keccak256(message),
        proof,
        index,
        message,
      );
      await replica.proveAndProcess(
        ethers.utils.keccak256(message),
        proof,
        index,
        message,
      );
    } catch (e) {
      console.log(
        `Error: Replica will reject proveAndProcess with message\n\t${e.message}`,
      );
    }
  });

const ethers = require('ethers');
const { types, task } = require('hardhat/config');
const utils = require('./utils.js');

task('prove', 'Prove a message inclusion to a replica')
  .addParam(
    'address',
    'The address of the replica contract.',
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

    let [signer] = await ethers.getSigners();
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
    'The address of the replica contract.',
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

    let [signer] = await ethers.getSigners();
    let replica = new optics.Replica(address, signer);

    try {
      await replica.callStatic.process(message);
      let tx = await replica.process(message);
      await utils.reportTxOutcome(tx);
    } catch (e) {
      console.error(
        `Error: Replica will reject process with message\n\t${e.message}`,
      );
    }
  });

task('prove-and-process', 'Prove and process a message')
  .addParam(
    'address',
    'The address of the replica contract.',
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
      throw new Error('message must be a 0x prefixed hex string');
    }

    let [signer] = await ethers.getSigners();
    let replica = new optics.Replica(address, signer);

    try {
      // preflight and make sure it works. This throws on revert
      await replica.callStatic.proveAndProcess(message, proof, index);
      await replica.proveAndProcess(message, proof, index);
    } catch (e) {
      console.error(
        `Error: Replica will reject proveAndProcess with message\n\t${e.message}`,
      );
    }
  });

task('enqueue', 'Enqueue a message on the Home chain')
  .addParam(
    'address',
    'The address of the replica contract.',
    undefined,
    types.string,
  )
  .addParam('destination', 'The destination chain.', undefined, types.int)
  .addParam('recipient', 'The message recipient.', undefined, types.string)
  .addParam('body', 'The message body.', undefined, types.string)
  .setAction(async (args) => {
    let address = ethers.utils.getAddress(args.address);
    let { destination, recipient, body } = args;

    ethers.utils.isHexString(recipient, 32);
    if (!ethers.utils.isHexString(message)) {
      throw new Error('body must be a 0x prefixed hex string');
    }

    let home = new optics.Home(address, signer);

    let tx = await home.enqueue(destination, recipient, body);
    await utils.reportTxOutcome(tx);
  });

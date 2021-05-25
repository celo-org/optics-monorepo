const { waffle, ethers } = require('hardhat');
const { provider } = waffle;
const { expect } = require('chai');
const { testCases } = require('../../../vectors/messageTestCases.json');

const remoteDomain = 1000;
const localDomain = 2000;

describe('Message', async () => {
  let messageLib;

  before(async () => {
    const MessageFactory = await ethers.getContractFactory('TestMessage');
    messageLib = await MessageFactory.deploy();
    await messageLib.deployed();
  });

  it('Returns fields from a message', async () => {
    const [sender, recipient] = provider.getWallets();
    const sequence = 1;
    const body = ethers.utils.formatBytes32String('message');

    const message = optics.formatMessage(
      remoteDomain,
      sender.address,
      sequence,
      localDomain,
      recipient.address,
      body,
    );

    expect(await messageLib.origin(message)).to.equal(remoteDomain);
    expect(await messageLib.sender(message)).to.equal(
      optics.ethersAddressToBytes32(sender.address),
    );
    expect(await messageLib.sequence(message)).to.equal(sequence);
    expect(await messageLib.destination(message)).to.equal(localDomain);
    expect(await messageLib.recipient(message)).to.equal(
      optics.ethersAddressToBytes32(recipient.address),
    );
    expect(await messageLib.recipientAddress(message)).to.equal(
      recipient.address,
    );
    expect(await messageLib.body(message)).to.equal(body);
  });

  it('Matches Rust-output OpticsMessage and leaf', async () => {
    const origin = 1000;
    const destination = 2000;
    const sender = '0x1111111111111111111111111111111111111111';
    const recipient = '0x2222222222222222222222222222222222222222';
    const sequence = 1;
    const body = ethers.utils.arrayify('0x1234');

    const opticsMessage = optics.formatMessage(
      origin,
      sender,
      sequence,
      destination,
      recipient,
      body,
    );

    const {
      origin: testOrigin,
      destination: testDestination,
      sender: testSender,
      recipient: testRecipient,
      sequence: testSequence,
      body: testBody,
      leaf,
    } = testCases[0];

    expect(await messageLib.origin(opticsMessage)).to.equal(testOrigin);
    expect(await messageLib.sender(opticsMessage)).to.equal(testSender);
    expect(await messageLib.sequence(opticsMessage)).to.equal(testSequence);
    expect(await messageLib.destination(opticsMessage)).to.equal(
      testDestination,
    );
    expect(await messageLib.recipient(opticsMessage)).to.equal(testRecipient);
    expect(await messageLib.body(opticsMessage)).to.equal(
      ethers.utils.hexlify(testBody),
    );
    expect(await messageLib.leaf(opticsMessage)).to.equal(leaf);
    expect(optics.messageToLeaf(opticsMessage)).to.equal(leaf);
  });
});

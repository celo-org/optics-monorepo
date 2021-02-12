const { waffle, ethers } = require('hardhat');
const { provider } = waffle;
const { expect } = require('chai');

const originDomain = 1000;
const ownDomain = 2000;

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
      originDomain,
      sender.address,
      sequence,
      ownDomain,
      recipient.address,
      body,
    );

    expect(await messageLib.origin(message)).to.equal(originDomain);
    expect(await messageLib.sender(message)).to.equal(
      optics.ethersAddressToBytes32(sender.address),
    );
    expect(await messageLib.sequence(message)).to.equal(sequence);
    expect(await messageLib.destination(message)).to.equal(ownDomain);
    expect(await messageLib.recipient(message)).to.equal(
      optics.ethersAddressToBytes32(recipient.address),
    );
    expect(await messageLib.recipientAddress(message)).to.equal(
      recipient.address,
    );
    expect(await messageLib.body(message)).to.equal(body);
  });
});

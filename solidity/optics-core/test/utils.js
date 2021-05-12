const { provider, deployMockContract } = waffle;
const MockRecipient = require('../artifacts/contracts/test/MockRecipient.sol/MockRecipient.json');

const [opticsMessageSender] = provider.getWallets();

class MockRecipientObject {
  constructor() {
    const [opticsMessageRecipient] = provider.getWallets();
    this.mockRecipient = deployMockContract(
      opticsMessageRecipient,
      MockRecipient.abi,
    );
  }

  async getRecipient() {
    return await this.mockRecipient;
  }
}

const increaseTimestampBy = async (provider, increaseTime) => {
  await provider.send('evm_increaseTime', [increaseTime]);
  await provider.send('evm_mine');
};

function getUnusedSigner(provider, numUsedSigners) {
  const wallets = provider.getWallets();

  if (wallets.length == numUsedSigners) {
    throw new Error('need more wallets to get an extra random signer');
  }

  return wallets[numUsedSigners];
}

const testUtils = {
  increaseTimestampBy,
  getUnusedSigner,
  opticsMessageSender,
  opticsMessageMockRecipient: new MockRecipientObject(),
};

module.exports = testUtils;

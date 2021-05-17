const { provider, deployMockContract } = waffle;
const TestRecipient = require('../artifacts/contracts/test/TestRecipient.sol/TestRecipient.json');

const [opticsMessageSender] = provider.getWallets();

class MockRecipientObject {
  constructor() {
    const [opticsMessageRecipient] = provider.getWallets();
    this.mockRecipient = deployMockContract(
      opticsMessageRecipient,
      TestRecipient.abi,
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

class WalletProvider {
  constructor(provider) {
    this.provider = provider;
    this.wallets = provider.getWallets();
    this.numUsedWallets = 0;
  }

  _getWallets(numWallets) {
    if (this.numUsedAccounts + numWallets > this.wallets.length) {
      throw new Error('Out of wallets!');
    }

    return this.wallets.slice(
      this.numUsedWallets,
      this.numUsedWallets + numWallets,
    );
  }

  getWalletsPersistent(numWallets) {
    const wallets = this._getWallets(numWallets);
    this.numUsedWallets += numWallets;
    return wallets;
  }

  getWalletsEphemeral(numWallets) {
    return this._getWallets(numWallets);
  }
}

const testUtils = {
  increaseTimestampBy,
  opticsMessageSender,
  opticsMessageMockRecipient: new MockRecipientObject(),
  WalletProvider,
};

module.exports = testUtils;

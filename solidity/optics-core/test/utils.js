const { ethers } = require('hardhat');
const { provider, deployMockContract } = waffle;
const TestRecipient = require('../artifacts/contracts/test/TestRecipient.sol/TestRecipient.json');

const [opticsMessageSender] = provider.getWallets();

class MockRecipientObject {
  constructor() {
    this.initPromise = ethers.getSigners().then(([signer]) => {
      this.mockRecipient = deployMockContract(signer, TestRecipient.abi);
    });
  }

  async getRecipient() {
    await this.initPromise;
    return await this.mockRecipient;
  }
}

const increaseTimestampBy = async (increaseTime) => {
  await ethers.provider.send('evm_increaseTime', [increaseTime]);
  await ethers.provider.send('evm_mine');
};

class SignerProvider {
  constructor() {
    this.provider = ethers.provider;
    this.signers = ethers.getSigners();
    this.signersResolved = false;
    this.numUsedSigners = 0; // 0th wallet is default account
  }

  async _getSigners(numSigners) {
    const signers = await this.signers;

    if (this.numUsedSigners + numSigners > signers.length) {
      throw new Error('Out of wallets!');
    }

    return signers.slice(this.numUsedSigners, this.numUsedSigners + numSigners);
  }

  async getSignersPersistent(numSigners) {
    const persistentSigners = await this._getSigners(numSigners);
    this.numUsedSigners += numSigners;
    return persistentSigners;
  }

  async getSignersEphemeral(numSigners) {
    return await this._getSigners(numSigners);
  }
}

const testUtils = {
  increaseTimestampBy,
  opticsMessageSender,
  opticsMessageMockRecipient: new MockRecipientObject(),
  SignerProvider,
};

module.exports = testUtils;

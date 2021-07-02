import { ethers } from 'hardhat';
import { TestRecipient__factory } from '../../typechain/optics-core';
import { MockProvider } from 'ethereum-waffle';

async function getMockRecipient() {
  const [signer] = await ethers.getSigners();
  const factory = new TestRecipient__factory(signer);
  const recipient = await factory.deploy();
  return recipient.address;
}
async function getMockSender() {
  const [opticsMessageSender] = await ethers.getSigners();
  return opticsMessageSender
}

const increaseTimestampBy = async (provider: MockProvider, increaseTime: number) => {
  await provider.send('evm_increaseTime', [increaseTime]);
  await provider.send('evm_mine', []);
};

class WalletProvider {
  provider: MockProvider;
  wallets: any[];
  numUsedWallets: number;

  constructor(provider: MockProvider) {
    this.provider = provider;
    this.wallets = provider.getWallets();
    this.numUsedWallets = 0;
  }

  _getWallets(numWallets: number) {
    if (this.numUsedWallets + numWallets > this.wallets.length) {
      throw new Error('Out of wallets!');
    }

    return this.wallets.slice(
      this.numUsedWallets,
      this.numUsedWallets + numWallets,
    );
  }

  getWalletsPersistent(numWallets: number) {
    const wallets = this._getWallets(numWallets);
    this.numUsedWallets += numWallets;
    return wallets;
  }

  getWalletsEphemeral(numWallets: number) {
    return this._getWallets(numWallets);
  }
}

const testUtils = {
  getMockRecipient,
  getMockSender,
  increaseTimestampBy,
  WalletProvider,
};

module.exports = testUtils;

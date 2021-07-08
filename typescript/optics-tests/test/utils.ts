import { MockProvider } from 'ethereum-waffle';

const increaseTimestampBy = async (provider: any, increaseTime: number) => {
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

export default {
  increaseTimestampBy,
  WalletProvider,
};

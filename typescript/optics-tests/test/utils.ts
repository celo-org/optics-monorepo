import { ethers, waffle, optics } from 'hardhat';
const { provider, deployMockContract } = waffle;
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import type { Contract } from "ethers";
import { EthereumProvider } from 'hardhat/types';
const TestRecipient = require('../artifacts/contracts/test/TestRecipient.sol/TestRecipient.json');

export async function getMockOpticsMessageSender(): Promise<SignerWithAddress> {
  const [opticsMessageSender] = await ethers.getSigners();
  return opticsMessageSender;
}

export async function getMockOpticsMessageRecipient(): Promise<Contract> {
  const [opticsMessageRecipient] = await ethers.getSigners();
  return await deployMockContract(opticsMessageRecipient, TestRecipient.abi);
}

const increaseTimestampBy = async (provider: EthereumProvider, increaseTime: number) => {
  await provider.send('evm_increaseTime', [increaseTime]);
  await provider.send('evm_mine');
};

class WalletProvider {
  provider: EthereumProvider;
  wallets: Promise<SignerWithAddress[]>;
  numUsedWallets: number;

  constructor(provider: EthereumProvider) {
    this.provider = provider;
    this.wallets = ethers.getSigners();
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

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
};

module.exports = testUtils;

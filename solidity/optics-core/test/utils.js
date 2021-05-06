const { provider, deployMockContract } = waffle;
const MockRecipient = require('../artifacts/contracts/test/MockRecipient.sol/MockRecipient.json');

const [opticsMessageSender, opticsMessageRecipient] = provider.getWallets();
const mockRecipientPromise = deployMockContract(
  opticsMessageRecipient,
  MockRecipient.abi,
);

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
  opticsMessageRecipient,
  mockRecipientPromise,
};

module.exports = testUtils;

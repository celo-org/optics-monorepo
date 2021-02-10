const increaseTimestampBy = async (provider, increaseTime) => {
  await provider.send('evm_increaseTime', [increaseTime]);
  await provider.send('evm_mine');
};

const testUtils = {
  increaseTimestampBy,
};

module.exports = testUtils;

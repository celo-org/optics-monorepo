const { expect } = require('chai');
const { optics } = require('hardhat');

describe('Home', async () => {
  it('test hre', () => {
    console.log(optics);
    expect(optics).to.not.be.null;
  });
});

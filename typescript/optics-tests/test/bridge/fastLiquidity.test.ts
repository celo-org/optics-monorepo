import { ethers } from 'hardhat';
import * as contracts from '../../../typechain/optics-xapps';

describe.skip('FastLiquidity', async () => {
  it('basic fast liquidity system', async () => {
    const [signer] = await ethers.getSigners();
    const factory = new contracts.TestFastLiquidity__factory(signer);
    const instance = await factory.deploy();
    await instance.test();
  });
});

import { ethers } from 'hardhat';

import * as contracts from '../../../typechain/optics-xapps';

describe('Encoding', async () => {
  it('encodes', async () => {
    const [signer] = await ethers.getSigners();
    const factory = new contracts.TestEncoding__factory(signer);
    const instance = await factory.deploy();

    await instance.test();
  });
});

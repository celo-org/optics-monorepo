import { ethers } from 'hardhat';
import { expect } from 'chai';
import { Wallet } from 'ethers';

import { Signer } from '../../lib/types';
import { permitDigest } from '../../lib/permit';
import {
  BridgeToken__factory,
  BridgeToken,
} from '../../../typechain/optics-xapps';

const VALUE = 100;

describe('BridgeToken', async () => {
  let deployer: Signer, permitee: Signer;
  let token: BridgeToken;
  let user: Wallet;
  before(async () => {
    [deployer, permitee] = await ethers.getSigners();
    user = new Wallet('0x' + '99'.repeat(32));
    const factory = new BridgeToken__factory(deployer);
    token = await factory.deploy();
  });

  it('should add allowance when permitted', async () => {
    const deadline = ethers.constants.MaxUint256;
    const owner = user.address;
    const spender = permitee.address;

    const digest = await permitDigest(token, {
      owner,
      spender,
      value: VALUE,
      deadline,
    });

    let { v, r, s } = await user._signingKey().signDigest(digest);

    await expect(token.permit(owner, spender, VALUE, deadline, v, r, s))
      .to.emit(token, 'Approval')
      .withArgs(owner, spender, VALUE);
    expect(await token.allowance(owner, spender)).to.equal(VALUE);
    expect(await token.nonces(owner)).to.equal(1);
  });

  it('should error on expired messages', async () => {
    const deadline = 1;
    const owner = user.address;
    const spender = permitee.address;

    const digest = await permitDigest(token, {
      owner,
      spender,
      value: VALUE,
      deadline,
    });

    let { v, r, s } = await user._signingKey().signDigest(digest);

    await expect(
      token.permit(owner, spender, VALUE, deadline, v, r, s),
    ).to.be.revertedWith('ERC20Permit: expired deadline');
  });

  it('should error if owner is 0', async () => {
    const deadline = ethers.constants.MaxUint256;
    const owner = ethers.constants.AddressZero;
    const spender = permitee.address;

    const digest = await permitDigest(token, {
      owner,
      spender,
      value: VALUE,
      deadline,
    });

    let { v, r, s } = await user._signingKey().signDigest(digest);

    await expect(
      token.permit(owner, spender, VALUE, deadline, v, r, s),
    ).to.be.revertedWith('ERC20Permit: owner zero address');
  });

  it('should error if the signature is invalid', async () => {
    const deadline = ethers.constants.MaxUint256;
    const owner = user.address;
    const spender = permitee.address;

    const digest = await permitDigest(token, {
      owner,
      spender,
      value: VALUE,
      deadline,
    });

    let { v, r, s } = await user._signingKey().signDigest(digest);

    await expect(
      token.permit(owner, spender, VALUE, deadline, v + 1, r, s),
    ).to.be.revertedWith('ERC20Permit: invalid signature');
  });
});

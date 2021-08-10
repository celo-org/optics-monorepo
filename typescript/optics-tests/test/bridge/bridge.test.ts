import { ethers } from 'hardhat';

import { Signer } from '../../lib/types';
import { BigNumber, BytesLike } from 'ethers';
import TestBridgeDeploy from '../../../optics-deploy/src/bridge/TestBridgeDeploy';
import { toBytes32 } from '../../lib/utils';
import { expect } from 'chai';
import { IERC20, IERC20__factory } from '../../../typechain/optics-xapps';

describe.only('Bridge', async () => {
  let deployer: Signer;
  let deployerAddress: String;
  let deployerId: BytesLike;

  let deploy: TestBridgeDeploy;
  let transferAction: BytesLike;

  const DOMAIN = 1;

  // 4-byte domain ID
  const DOMAIN_BYTES = `0x0000000${DOMAIN}`;

  // 32-byte token address
  const CANONICAL_TOKEN_ADDRESS = `0x${'11'.repeat(32)}`;

  // 36 byte token id
  const TOKEN_ID = ethers.utils.concat([DOMAIN_BYTES, CANONICAL_TOKEN_ADDRESS]);

  // 32-byte token value
  const TOKEN_VALUE = `0x${'00'.repeat(30)}ffff`;

  before(async () => {
    [deployer] = await ethers.getSigners();
    deployerAddress = await deployer.getAddress();

    deploy = await TestBridgeDeploy.deploy(deployer);
    deployerId = toBytes32(await deployer.getAddress());
    transferAction = ethers.utils.concat([deployerId, TOKEN_VALUE]);
  });

  it('handles a transfer message', async () => {
    const message = ethers.utils.concat([TOKEN_ID, transferAction]);

    await deploy.contracts.bridgeRouter!.proxy.handle(
      DOMAIN,
      deployerId,
      message,
    );

    const reprAddr = await deploy.contracts.bridgeRouter!.proxy[
      'getLocalAddress(uint32,bytes32)'
    ](DOMAIN, CANONICAL_TOKEN_ADDRESS);
    const repr = IERC20__factory.connect(reprAddr, deployer);

    expect(await repr.balanceOf(deployer.address)).to.equal(
      BigNumber.from(TOKEN_VALUE),
    );
  });
});

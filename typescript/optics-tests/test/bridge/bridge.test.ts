import { ethers } from 'hardhat';
import { expect } from 'chai';

import { Signer } from '../../lib/types';
import { BytesLike } from 'ethers';
import TestBridgeDeploy from '../../../optics-deploy/src/bridge/TestBridgeDeploy';
import { toBytes32 } from '../../lib/utils';

describe.only('Bridge', async () => {
  let deployer: Signer;
  let deploy: TestBridgeDeploy;
  let deployerId: BytesLike;

  const DOMAIN = 1;

  before(async () => {
    [deployer] = await ethers.getSigners();
    deploy = await TestBridgeDeploy.deploy(deployer);
    deployerId = toBytes32(await deployer.getAddress());
  });

  it('handles a message', async () => {
    await deploy.contracts.bridgeRouter!.proxy.handle(1, deployerId, '0x');
  });
});

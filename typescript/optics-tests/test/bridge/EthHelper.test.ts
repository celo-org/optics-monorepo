import { ethers } from 'hardhat';
import { Signer, Wallet } from 'ethers';
import {
  BridgeToken,
  BridgeToken__factory,
} from '../../../typechain/optics-xapps';
import TestBridgeDeploy from '../../../optics-deploy/src/bridge/TestBridgeDeploy';
import { expect } from 'chai';
import { toBytes32 } from '../../lib/utils';

describe('EthHelper', async () => {
  let deployer: Signer;
  let deployerAddress: string;
  let deployerId: string;
  let deploy: TestBridgeDeploy;

  let transferMessage: string;

  const value = 1;
  const valueBytes = ethers.utils.zeroPad('0x01', 32);
  const TRANSFER_TAG = '0x03';

  before(async () => {
    [deployer] = await ethers.getSigners();
    deployerAddress = await deployer.getAddress();
    deployerId = toBytes32(deployerAddress).toLowerCase();
    deploy = await TestBridgeDeploy.deploy(deployer);

    const tokenId = ethers.utils.hexConcat([
      deploy.localDomainBytes,
      toBytes32(deploy.mockWeth.address),
    ]);
    const transferAction = ethers.utils.hexConcat([
      TRANSFER_TAG,
      deployerId,
      valueBytes,
    ]);
    transferMessage = ethers.utils.hexConcat([tokenId, transferAction]);
  });

  it('send function', async () => {
    let sendTx = deploy.contracts.ethHelper!.send(deploy.remoteDomain, {
      value,
    });

    await expect(sendTx)
      .to.emit(deploy.mockCore, 'Enqueue')
      .withArgs(deploy.remoteDomain, deployerId, transferMessage);
  });

  it('sendTo function', async () => {
    let sendTx = deploy.contracts.ethHelper!.sendTo(
      deploy.remoteDomain,
      deployerId,
      {
        value,
      },
    );

    await expect(sendTx)
      .to.emit(deploy.mockCore, 'Enqueue')
      .withArgs(deploy.remoteDomain, deployerId, transferMessage);
  });

  it('sendToEVMLike function', async () => {
    let sendTx = deploy.contracts.ethHelper!.sendToEVMLike(
      deploy.remoteDomain,
      deployerAddress,
      {
        value,
      },
    );

    await expect(sendTx)
      .to.emit(deploy.mockCore, 'Enqueue')
      .withArgs(deploy.remoteDomain, deployerId, transferMessage);
  });
});

import { ethers, bridge } from 'hardhat';
const { BridgeMessageTypes } = bridge;
import { Signer } from 'ethers';
import { expect } from 'chai';

import * as types from '../../lib/types';
import { toBytes32 } from '../../lib/utils';
import TestBridgeDeploy from '../../../optics-deploy/src/bridge/TestBridgeDeploy';

describe('EthHelper', async () => {
  let deploy: TestBridgeDeploy;

  let deployer: Signer;
  let deployerAddress: string;
  let deployerId: string;

  let recipient: Signer;
  let recipientAddress: string;
  let recipientId: string;

  let transferToSelfMessage: string;
  let transferMessage: string;

  const value = 1;

  before(async () => {
    [deployer, recipient] = await ethers.getSigners();
    deployerAddress = await deployer.getAddress();
    deployerId = toBytes32(deployerAddress).toLowerCase();
    recipientAddress = await recipient.getAddress();
    recipientId = toBytes32(recipientAddress).toLowerCase();
    deploy = await TestBridgeDeploy.deploy(deployer);

    const tokenId: types.TokenId = {
      domain: deploy.localDomain,
      id: toBytes32(deploy.mockWeth.address)
    }
    const transferToSelfMessageObj: types.Message = {
      tokenId,
      action: {
        type: BridgeMessageTypes.TRANSFER,
        recipient: deployerId,
        amount: value
      }
    }
    transferToSelfMessage = bridge.serializeMessage(transferToSelfMessageObj);

    const transferMessageObj: types.Message = {
      tokenId,
      action: {
        type: BridgeMessageTypes.TRANSFER,
        recipient: recipientId,
        amount: value
      }
    }
    transferMessage = bridge.serializeMessage(transferMessageObj);
  });

  it('send function', async () => {
    let sendTx = deploy.contracts.ethHelper!.send(deploy.remoteDomain, {
      value,
    });

    await expect(sendTx)
      .to.emit(deploy.mockCore, 'Enqueue')
      .withArgs(deploy.remoteDomain, deployerId, transferToSelfMessage);
  });

  it('sendTo function', async () => {
    let sendTx = deploy.contracts.ethHelper!.sendTo(
      deploy.remoteDomain,
      recipientId,
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
      recipientAddress,
      {
        value,
      },
    );

    await expect(sendTx)
      .to.emit(deploy.mockCore, 'Enqueue')
      .withArgs(deploy.remoteDomain, deployerId, transferMessage);
  });
});

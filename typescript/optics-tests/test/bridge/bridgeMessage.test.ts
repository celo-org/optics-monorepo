import { ethers, bridge } from 'hardhat';
const { BridgeMessageTypes } = bridge;
import { BytesLike } from 'ethers';
// import { expect } from 'chai';
// import { Wallet } from 'ethers';

// import { Signer } from '../../lib/types';
// import { permitDigest } from '../../lib/permit';
import { toBytes32 } from '../../lib/utils';
import * as types from '../../lib/types';
import {
  TestBridgeMessage__factory,
  TestBridgeMessage
} from '../../../typechain/optics-xapps';
import TestBridgeDeploy from '../../../optics-deploy/src/bridge/TestBridgeDeploy';

const stringToBytes32 = (s: string): string => {
  const str = Buffer.from(s.slice(0, 32), 'utf-8');
  const result = Buffer.alloc(32);
  str.copy(result);

  return '0x' + result.toString('hex');
};

describe('BridgeMessage', async () => {
  let bridgeMessage: TestBridgeMessage;
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const deployerId = toBytes32(await deployer.getAddress()).toLowerCase();
  const TOKEN_VALUE = 0xffff;

  let transferMessage: BytesLike, requestDetails: BytesLike, detailsMessage: BytesLike;
  let deploy: TestBridgeDeploy;

  before(async () => {
    const [signer] = await ethers.getSigners();

    const bridgeMessageFactory = new TestBridgeMessage__factory(signer);
    bridgeMessage = await bridgeMessageFactory.deploy();
    deploy = await TestBridgeDeploy.deploy(deployer);

    const transferMessageObj: types.Message = {
      tokenId: deploy.testTokenId,
      action: {
        type: BridgeMessageTypes.TRANSFER,
        recipient: deployerId,
        amount: TOKEN_VALUE
      }
    }
    transferMessage = bridge.serializeMessage(transferMessageObj);

    const requestDetailsObj: types.Message = {
      tokenId: deploy.testTokenId,
      action: {
        type: BridgeMessageTypes.REQUEST_DETAILS
      }
    }
    requestDetails = bridge.serializeMessage(requestDetailsObj);

    const TEST_NAME = 'TEST TOKEN';
    const TEST_SYMBOL = 'TEST';
    const TEST_DECIMALS = 8;
    const detailsObj: types.Message = {
      tokenId: deploy.testTokenId,
      action: {
        type: BridgeMessageTypes.DETAILS,
        name: stringToBytes32(TEST_NAME),
        symbol: stringToBytes32(TEST_SYMBOL),
        decimal: TEST_DECIMALS
      }
    }
    detailsMessage = bridge.serializeMessage(detailsObj);
  });
});
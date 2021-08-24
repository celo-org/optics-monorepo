import { ethers, bridge } from 'hardhat';
const { BridgeMessageTypes } = bridge;
import { BytesLike } from 'ethers';
import { expect } from 'chai';
// import { Wallet } from 'ethers';

// import { Signer } from '../../lib/types';
// import { permitDigest } from '../../lib/permit';
import { toBytes32 } from '../../lib/utils';
import { formatTokenId } from '../../lib/bridge';
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

  let
    deploy: TestBridgeDeploy,
    transferAction: types.TransferAction,
    detailsAction: types.DetailsAction,
    requestDetailsAction: types.RequestDetailsAction,
    transferMessage: BytesLike,
    requestDetails: BytesLike,
    detailsMessage: BytesLike

  before(async () => {
    const [signer] = await ethers.getSigners();

    const bridgeMessageFactory = new TestBridgeMessage__factory(signer);
    bridgeMessage = await bridgeMessageFactory.deploy();
    deploy = await TestBridgeDeploy.deploy(deployer);

    transferAction = {
      type: BridgeMessageTypes.TRANSFER,
      recipient: deployerId,
      amount: TOKEN_VALUE
    }
    const transferMessageObj: types.Message = {
      tokenId: deploy.testTokenId,
      action: transferAction
    }
    transferMessage = bridge.serializeMessage(transferMessageObj);

    requestDetailsAction = { type: BridgeMessageTypes.REQUEST_DETAILS };
    const requestDetailsObj: types.Message = {
      tokenId: deploy.testTokenId,
      action: {
        type: BridgeMessageTypes.REQUEST_DETAILS
      }
    }
    requestDetails = bridge.serializeMessage(requestDetailsObj);

    detailsAction = {
      type: BridgeMessageTypes.DETAILS,
      name: stringToBytes32('TEST TOKEN'),
      symbol: stringToBytes32('TEST'),
      decimal: 8
    }
    const detailsObj: types.Message = {
      tokenId: deploy.testTokenId,
      action: detailsAction
    }
    detailsMessage = bridge.serializeMessage(detailsObj);
  });

  it('validates actions', async () => {
    const transfer = bridge.serializeTransferAction(transferAction);
    const details = bridge.serializeDetailsAction(detailsAction);
    const requestDeets = bridge.serializeRequestDetailsAction(requestDetailsAction);

    const invalidAction = '0x00';
    const invalidActionLen = '0x0300'

    // transfer message is valid
    let isAction = await bridgeMessage.testIsValidAction(transfer, BridgeMessageTypes.TRANSFER);
    expect(isAction).to.be.true;
    // details message is valid
    isAction = await bridgeMessage.testIsValidAction(details, BridgeMessageTypes.DETAILS);
    expect(isAction).to.be.true;
    // request details message is valid
    isAction = await bridgeMessage.testIsValidAction(requestDeets, BridgeMessageTypes.REQUEST_DETAILS);
    expect(isAction).to.be.true;
    // not a valid message type
    isAction = await bridgeMessage.testIsValidAction(transfer, BridgeMessageTypes.INVALID);
    expect(isAction).to.be.false;
    // not a valid action type
    isAction = await bridgeMessage.testIsValidAction(invalidAction, BridgeMessageTypes.TRANSFER);
    expect(isAction).to.be.false;
    // TODO: Action length is not checked, should it be? We do check message length
    // invalid length
    // isAction = await bridgeMessage.testIsValidAction(invalidActionLen, BridgeMessageTypes.TRANSFER);
    // expect(isAction).to.be.false;
  });

  it('validates message length', async () => {
    const invalidMessageLen = '0x' + '03'.repeat(38);
    // valid transfer message
    let isValidLen = await bridgeMessage.testIsValidMessageLength(transferMessage);
    expect(isValidLen).to.be.true;
    // valid details message
    isValidLen = await bridgeMessage.testIsValidMessageLength(detailsMessage);
    expect(isValidLen).to.be.true;
    // valid requestDetails message
    isValidLen = await bridgeMessage.testIsValidMessageLength(requestDetails);
    expect(isValidLen).to.be.true;
    // invalid message length
    isValidLen = await bridgeMessage.testIsValidMessageLength(invalidMessageLen);
    expect(isValidLen).to.be.false;
    // TODO: check that message length matches type?
  });

  it('formats message', async () => {
    const tokenId = formatTokenId(deploy.remoteDomain, deploy.testToken);
    const transfer = bridge.serializeTransferAction(transferAction);

    // formats message
    const newMessage = await bridgeMessage.testFormatMessage(tokenId, transfer, BridgeMessageTypes.TOKEN_ID, BridgeMessageTypes.TRANSFER);
    expect(newMessage).to.equal(transferMessage);
    // reverts with bad tokenId
    await expect(bridgeMessage.testFormatMessage(tokenId, transfer, BridgeMessageTypes.INVALID, BridgeMessageTypes.TRANSFER)).to.be.reverted;
    // reverts with bad action
    await expect(bridgeMessage.testFormatMessage(tokenId, transfer, BridgeMessageTypes.TOKEN_ID, BridgeMessageTypes.INVALID)).to.be.revertedWith('!action');
  });

  it('returns correct message type', async () => {
    // transfer message
    let type = await bridgeMessage.testMessageType(transferMessage);
    expect(type).to.equal(BridgeMessageTypes.TRANSFER);
    // details message
    type = await bridgeMessage.testMessageType(detailsMessage);
    expect(type).to.equal(BridgeMessageTypes.DETAILS);
    // request details message
    type = await bridgeMessage.testMessageType(requestDetails);
    expect(type).to.equal(BridgeMessageTypes.REQUEST_DETAILS);
  });

  it('checks message type', async () => {
    const transfer = bridge.serializeTransferAction(transferAction);
    const details = bridge.serializeDetailsAction(detailsAction);
    const requestDeets = bridge.serializeRequestDetailsAction(requestDetailsAction);

    // transfer message
    let isTransfer = await bridgeMessage.testIsTransfer(transfer);
    expect(isTransfer).to.be.true;
    isTransfer = await bridgeMessage.testIsTransfer(details);
    expect(isTransfer).to.be.false;
    isTransfer = await bridgeMessage.testIsTransfer(requestDeets);
    expect(isTransfer).to.be.false;

    let isDetails = await bridgeMessage.testIsDetails(details);
    expect(isDetails).to.be.true;
    isDetails = await bridgeMessage.testIsDetails(transfer);
    expect(isDetails).to.be.false;
    isDetails = await bridgeMessage.testIsDetails(requestDeets);
    expect(isDetails).to.be.false;

    let isRequestDetails = await bridgeMessage.testIsRequestDetails(requestDeets);
    expect(isRequestDetails).to.be.true;
    isRequestDetails = await bridgeMessage.testIsRequestDetails(details);
    expect(isRequestDetails).to.be.false;
    isRequestDetails = await bridgeMessage.testIsRequestDetails(transfer);
    expect(isRequestDetails).to.be.false;
  });

  it('fails for wrong action type', async () => {
    const invalidType = "0x00"
    const transfer = bridge.serializeTransferAction(transferAction);
    const badTransfer: BytesLike = invalidType + transfer.slice(4);
    const details = bridge.serializeDetailsAction(detailsAction);
    const badDetails: BytesLike = invalidType + details.slice(4);
    const requestDeets = bridge.serializeRequestDetailsAction(requestDetailsAction);
    const badRequest: BytesLike = invalidType + requestDeets.slice(4);

    const isTransfer = await bridgeMessage.testIsTransfer(badTransfer);
    expect(isTransfer).to.be.false;
    const isDetails = await bridgeMessage.testIsDetails(badDetails);
    expect(isDetails).to.be.false;
    const isRequest = await bridgeMessage.testIsRequestDetails(badRequest);
    expect(isRequest).to.be.false;
  });
});
import { ethers } from 'hardhat';
import { Signer } from '../../lib/types';
import { BigNumber, BytesLike } from 'ethers';
import TestBridgeDeploy from '../../../optics-deploy/src/bridge/TestBridgeDeploy';
import { toBytes32 } from '../../lib/utils';
import { expect } from 'chai';
import {
  IERC20__factory,
  BridgeRouter,
  IERC20,
} from '../../../typechain/optics-xapps';

const BRIDGE_MESSAGE_TYPES = {
  INVALID: 0,
  TOKEN_ID: 1,
  MESSAGE: 2,
  TRANSFER: 3,
  DETAILS: 4,
  REQUEST_DETAILS: 5,
};

const typeToBytes = (type: number) => `0x0${type}`;

describe.only('Bridge', async () => {
  let deployer: Signer;
  let deployerAddress: String;
  let deployerId: BytesLike;
  let deploy: TestBridgeDeploy;
  let transferAction: BytesLike;
  let transferMessage: BytesLike;

  const PROTOCOL_PROCESS_GAS = 650_000;

  // 1-byte Action Type
  const TRANSFER_BYTES = typeToBytes(BRIDGE_MESSAGE_TYPES.TRANSFER);

  // Numerical token value
  const TOKEN_VALUE = 0xffff;
  // 32-byte token value
  const TOKEN_VALUE_BYTES = `0x${'00'.repeat(30)}ffff`;

  before(async () => {
    // populate deployer signer
    [deployer] = await ethers.getSigners();
    deployerAddress = await deployer.getAddress();
    deployerId = toBytes32(await deployer.getAddress()).toLowerCase();
    // run test deploy of bridge contracts
    deploy = await TestBridgeDeploy.deploy(deployer);

    // generate transfer action
    transferAction = ethers.utils.hexConcat([
      TRANSFER_BYTES,
      deployerId,
      TOKEN_VALUE_BYTES,
    ]);
    transferMessage = ethers.utils.hexConcat([
      deploy.testTokenId,
      transferAction,
    ]);
  });

  describe('transfer message', async () => {
    it('remotely-originating asset roundtrip', async () => {
      // INBOUND

      let handleTx = await deploy.bridgeRouter!.handle(
        deploy.remoteDomain,
        deployerId,
        transferMessage,
        { gasLimit: PROTOCOL_PROCESS_GAS },
      );

      expect(handleTx).to.emit(deploy.bridgeRouter!, 'TokenDeployed');

      const repr = await deploy.getTestRepresentation();

      expect(repr).to.not.be.undefined;
      expect(await repr!.balanceOf(deployer.address)).to.equal(
        BigNumber.from(TOKEN_VALUE),
      );
      expect(await repr!.totalSupply()).to.equal(BigNumber.from(TOKEN_VALUE));

      // OUTBOUND, TOO MANY TOKENS
      const stealTx = deploy.bridgeRouter!.send(
        repr!.address,
        TOKEN_VALUE * 10,
        deploy.remoteDomain,
        deployerId,
      );

      await expect(stealTx).to.be.revertedWith(
        'ERC20: burn amount exceeds balance',
      );

      // OUTBOUND
      const sendTx = await deploy.bridgeRouter!.send(
        repr!.address,
        TOKEN_VALUE,
        deploy.remoteDomain,
        deployerId,
      );

      expect(await sendTx)
        .to.emit(deploy.mockCore, 'Enqueue')
        .withArgs(deploy.remoteDomain, deployerId, transferMessage);

      expect(await repr!.totalSupply()).to.equal(BigNumber.from(0));

      // OUTBOUND, NO Tokens
      const badTx = deploy.bridgeRouter!.send(
        repr!.address,
        TOKEN_VALUE,
        deploy.remoteDomain,
        deployerId,
      );
      await expect(badTx).to.be.revertedWith(
        'ERC20: burn amount exceeds balance',
      );
    });

    it.skip('locally-originating asset roundtrip', async () => {
      // Additional setup:
      // deploy a new ERC20 and give tokens to the deployer
      // Call send
      // Test that it properly holds local tokens
      // Test that it sends a message to the fake home (check logs)
      // Call handle with a transfer of the same asset
      // Test that it properly transfers held tokens
    });
  });
});

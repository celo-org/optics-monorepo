import { ethers } from 'hardhat';
import { Signer } from '../../lib/types';
import { BigNumber, BytesLike } from 'ethers';
import TestBridgeDeploy from '../../../optics-deploy/src/bridge/TestBridgeDeploy';
import { toBytes32 } from '../../lib/utils';
import { expect } from 'chai';
import { BridgeToken__factory } from '../../../typechain/optics-xapps';

const BRIDGE_MESSAGE_TYPES = {
  INVALID: 0,
  TOKEN_ID: 1,
  MESSAGE: 2,
  TRANSFER: 3,
  DETAILS: 4,
  REQUEST_DETAILS: 5,
};

const typeToBytes = (type: number) => `0x0${type}`;

describe('Bridge', async () => {
  let deployer: Signer;
  let deployerAddress: string;
  let deployerId: BytesLike;
  let deploy: TestBridgeDeploy;

  const PROTOCOL_PROCESS_GAS = 800_000;

  // 1-byte Action Type
  const TRANSER_TAG = typeToBytes(BRIDGE_MESSAGE_TYPES.TRANSFER);

  // Numerical token value
  const TOKEN_VALUE = 0xffff;
  // 32-byte token value
  const TOKEN_VALUE_BYTES = `0x${'00'.repeat(30)}ffff`;

  before(async () => {
    // populate deployer signer
    [deployer] = await ethers.getSigners();
    deployerAddress = await deployer.getAddress();
    deployerId = toBytes32(await deployer.getAddress()).toLowerCase();
  });

  beforeEach(async () => {
    // run test deploy of bridge contracts
    deploy = await TestBridgeDeploy.deploy(deployer);
  });

  describe('transfer message', async () => {
    it('errors when missing a remote router', async () => {
      expect(
        deploy.bridgeRouter!.send(
          ethers.constants.AddressZero,
          0,
          12378,
          `0x${'00'.repeat(32)}`,
        ),
      ).to.be.revertedWith('!remote');
    });

    it('remotely-originating asset roundtrip', async () => {
      // generate transfer action
      const transferAction = ethers.utils.hexConcat([
        TRANSER_TAG,
        deployerId,
        TOKEN_VALUE_BYTES,
      ]);
      const transferMessage = ethers.utils.hexConcat([
        deploy.testTokenId,
        transferAction,
      ]);

      // INBOUND

      let handleTx = await deploy.bridgeRouter!.handle(
        deploy.remoteDomain,
        deployerId,
        transferMessage,
        { gasLimit: PROTOCOL_PROCESS_GAS },
      );

      await expect(handleTx).to.emit(deploy.bridgeRouter!, 'TokenDeployed');

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

      await expect(sendTx)
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

    it('locally-originating asset roundtrip', async () => {
      // SETUP

      const localToken = await new BridgeToken__factory(deployer).deploy();
      await localToken.initialize();
      await localToken.mint(deployerAddress, TOKEN_VALUE);

      // generate protocol messages
      const localTokenId = ethers.utils.hexConcat([
        deploy.localDomainBytes,
        toBytes32(localToken.address),
      ]);
      const transferAction = ethers.utils.hexConcat([
        TRANSER_TAG,
        deployerId,
        TOKEN_VALUE_BYTES,
      ]);
      const transferMessage = ethers.utils.hexConcat([
        localTokenId,
        transferAction,
      ]);

      expect(await localToken.balanceOf(deployerAddress)).to.equal(
        BigNumber.from(TOKEN_VALUE),
      );
      expect(await localToken.balanceOf(deploy.bridgeRouter!.address)).to.equal(
        BigNumber.from(0),
      );

      // TOKEN NOT APPROVED
      const unapproved = deploy.bridgeRouter!.send(
        localToken.address,
        1,
        deploy.remoteDomain,
        deployerId,
      );

      expect(unapproved).to.be.revertedWith(
        'ERC20: transfer amount exceeds allowance',
      );
      expect(await localToken.balanceOf(deploy.bridgeRouter!.address)).to.equal(
        BigNumber.from(0),
      );

      // INSUFFICIENT BALANCE
      await localToken.approve(
        deploy.bridgeRouter!.address,
        ethers.constants.MaxUint256,
      );

      const badTx = deploy.bridgeRouter!.send(
        localToken.address,
        TOKEN_VALUE * 5,
        deploy.remoteDomain,
        deployerId,
      );

      expect(badTx).to.be.revertedWith(
        'ERC20: transfer amount exceeds balance',
      );
      expect(await localToken.balanceOf(deploy.bridgeRouter!.address)).to.equal(
        BigNumber.from(0),
      );

      // OUTBOUND
      const sendTx = await deploy.bridgeRouter!.send(
        localToken.address,
        TOKEN_VALUE,
        deploy.remoteDomain,
        deployerId,
      );

      await expect(sendTx)
        .to.emit(deploy.mockCore, 'Enqueue')
        .withArgs(deploy.remoteDomain, deployerId, transferMessage);

      expect(await localToken.balanceOf(deploy.bridgeRouter!.address)).to.equal(
        BigNumber.from(TOKEN_VALUE),
      );

      // INBOUND
      let handleTx = await deploy.bridgeRouter!.handle(
        deploy.remoteDomain,
        deployerId,
        transferMessage,
        { gasLimit: PROTOCOL_PROCESS_GAS },
      );

      expect(handleTx).to.not.emit(deploy.bridgeRouter!, 'TokenDeployed');

      expect(await localToken.balanceOf(deploy.bridgeRouter!.address)).to.equal(
        BigNumber.from(0),
      );

      expect(await localToken.balanceOf(deployerAddress)).to.equal(
        BigNumber.from(TOKEN_VALUE),
      );
    });
  });

  describe('Prefill', async () => {
    it('errors for non-existing assets', async () => {
      // generate transfer action
      const transferAction = ethers.utils.hexConcat([
        TRANSER_TAG,
        deployerId,
        TOKEN_VALUE_BYTES,
      ]);
      const transferMessage = ethers.utils.hexConcat([
        deploy.testTokenId,
        transferAction,
      ]);

      expect(deploy.bridgeRouter!.preFill(transferMessage)).to.be.revertedWith(
        '!token',
      );
    });

    it('remotely-originating asset', async () => {
      // SETUP REPRESENTATION
      const setupAction = ethers.utils.hexConcat([
        TRANSER_TAG,
        deployerId,
        TOKEN_VALUE_BYTES,
      ]);
      const setupMessage = ethers.utils.hexConcat([
        deploy.testTokenId,
        setupAction,
      ]);

      const setupTx = await deploy.bridgeRouter!.handle(
        deploy.remoteDomain,
        deployerId,
        setupMessage,
        { gasLimit: PROTOCOL_PROCESS_GAS },
      );

      await expect(setupTx).to.emit(deploy.bridgeRouter!, 'TokenDeployed');
      const repr = await deploy.getTestRepresentation();
      expect(await repr!.balanceOf(deployerAddress)).to.equal(
        BigNumber.from(TOKEN_VALUE),
      );

      // APPROVE
      await repr?.approve(
        deploy.bridgeRouter!.address,
        ethers.constants.MaxUint256,
      );

      // generate transfer action
      const recipient = `0x${'00'.repeat(19)}ff`;
      const recipientId = toBytes32(recipient);
      const transferAction = ethers.utils.hexConcat([
        TRANSER_TAG,
        recipientId,
        TOKEN_VALUE_BYTES,
      ]);
      const transferMessage = ethers.utils.hexConcat([
        deploy.testTokenId,
        transferAction,
      ]);

      // DISPATCH PREFILL TX
      const prefillTx = await deploy.bridgeRouter!.preFill(transferMessage);
      await expect(prefillTx)
        .to.emit(repr, 'Transfer')
        .withArgs(
          deployerAddress,
          recipient,
          BigNumber.from(TOKEN_VALUE).mul(9995).div(10000),
        );

      // DELIVER PREFILLED MESSAGE
      let deliver = deploy.bridgeRouter!.handle(
        deploy.remoteDomain,
        deployerId,
        transferMessage,
        { gasLimit: PROTOCOL_PROCESS_GAS },
      );
      await expect(deliver)
        .to.emit(repr, 'Transfer')
        .withArgs(ethers.constants.AddressZero, deployerAddress, TOKEN_VALUE);
    });

    it('locally-originating asset', async () => {
      // SETUP

      const localToken = await new BridgeToken__factory(deployer).deploy();
      await localToken.initialize();
      await localToken.mint(deployerAddress, TOKEN_VALUE);
      await localToken.mint(deploy.bridgeRouter!.address, TOKEN_VALUE);
      await localToken.approve(
        deploy.bridgeRouter!.address,
        ethers.constants.MaxUint256,
      );

      expect(await localToken.balanceOf(deployerAddress)).to.equal(
        BigNumber.from(TOKEN_VALUE),
      );
      expect(await localToken.balanceOf(deploy.bridgeRouter!.address)).to.equal(
        BigNumber.from(TOKEN_VALUE),
      );

      // generate transfer action
      const recipient = `0x${'00'.repeat(19)}ff`;
      const recipientId = toBytes32(recipient);
      const localTokenId = ethers.utils.hexConcat([
        deploy.localDomainBytes,
        toBytes32(localToken.address),
      ]);
      const transferAction = ethers.utils.hexConcat([
        TRANSER_TAG,
        recipientId,
        TOKEN_VALUE_BYTES,
      ]);
      const transferMessage = ethers.utils.hexConcat([
        localTokenId,
        transferAction,
      ]);

      // DISPATCH PREFILL TX
      const prefillTx = await deploy.bridgeRouter!.preFill(transferMessage);
      await expect(prefillTx)
        .to.emit(localToken, 'Transfer')
        .withArgs(
          deployerAddress,
          recipient,
          BigNumber.from(TOKEN_VALUE).mul(9995).div(10000),
        );

      // DELIVER PREFILLED MESSAGE
      let deliver = deploy.bridgeRouter!.handle(
        deploy.remoteDomain,
        deployerId,
        transferMessage,
        { gasLimit: PROTOCOL_PROCESS_GAS },
      );
      await expect(deliver)
        .to.emit(localToken, 'Transfer')
        .withArgs(deploy.bridgeRouter!.address, deployerAddress, TOKEN_VALUE);
    });
  });
});

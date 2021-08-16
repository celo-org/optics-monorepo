import { ethers } from 'hardhat';
import { Signer } from '../../lib/types';
import { BigNumber, BytesLike } from 'ethers';
import TestBridgeDeploy from '../../../optics-deploy/src/bridge/TestBridgeDeploy';
import { toBytes32 } from '../../lib/utils';
import { expect } from 'chai';
import {
  BridgeToken,
  BridgeToken__factory,
  IERC20,
} from '../../../typechain/optics-xapps';
import { assert } from 'console';
import { domain } from 'process';

const BRIDGE_MESSAGE_TYPES = {
  INVALID: 0,
  TOKEN_ID: 1,
  MESSAGE: 2,
  TRANSFER: 3,
  DETAILS: 4,
  REQUEST_DETAILS: 5,
};

const typeToByte = (type: number): string => `0x0${type}`;
const stringToBytes32 = (s: string): string => {
  const str = Buffer.from(s.slice(0, 32), 'utf-8');
  const result = Buffer.alloc(32);
  str.copy(result);

  return '0x' + result.toString('hex');
};

describe('BridgeRouter', async () => {
  let deployer: Signer;
  let deployerAddress: string;
  let deployerId: BytesLike;
  let deploy: TestBridgeDeploy;

  const PROTOCOL_PROCESS_GAS = 800_000;

  // 1-byte Action Type
  const TRANSER_TAG = typeToByte(BRIDGE_MESSAGE_TYPES.TRANSFER);

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

  describe('transfer message', async () => {
    before(async () => {
      deploy = await TestBridgeDeploy.deploy(deployer);
    });

    it('errors when missing a remote router', async () => {
      expect(
        deploy.bridgeRouter!.send(
          ethers.constants.AddressZero,
          10,
          12378,
          `0x${'00'.repeat(32)}`,
        ),
      ).to.be.revertedWith('!remote');
    });

    describe('remotely-originating asset roundtrup', async () => {
      let transferAction: string;
      let transferMessage: string;
      let repr: IERC20;

      before(async () => {
        deploy = await TestBridgeDeploy.deploy(deployer);

        // generate transfer action
        transferAction = ethers.utils.hexConcat([
          TRANSER_TAG,
          deployerId,
          TOKEN_VALUE_BYTES,
        ]);
        transferMessage = ethers.utils.hexConcat([
          deploy.testTokenId,
          transferAction,
        ]);
      });

      it('deploys a token on first inbound transfer', async () => {
        let handleTx = await deploy.bridgeRouter!.handle(
          deploy.remoteDomain,
          deployerId,
          transferMessage,
          { gasLimit: PROTOCOL_PROCESS_GAS },
        );

        const representation = await deploy.getTestRepresentation();
        expect(representation).to.not.be.undefined;
        repr = representation!;

        await expect(handleTx).to.emit(deploy.bridgeRouter!, 'TokenDeployed');
        await expect(handleTx)
          .to.emit(deploy.mockCore, 'Enqueue')
          .withArgs(
            deploy.remoteDomain,
            deployerId,
            ethers.utils.hexConcat([
              deploy.testTokenId,
              typeToByte(BRIDGE_MESSAGE_TYPES.REQUEST_DETAILS),
            ]),
          );
        expect(await repr!.balanceOf(deployer.address)).to.equal(
          BigNumber.from(TOKEN_VALUE),
        );
        expect(await repr!.totalSupply()).to.equal(BigNumber.from(TOKEN_VALUE));
      });

      it('errors on send if ERC20 balance is insufficient', async () => {
        const stealTx = deploy.bridgeRouter!.send(
          repr!.address,
          TOKEN_VALUE * 10,
          deploy.remoteDomain,
          deployerId,
        );

        await expect(stealTx).to.be.revertedWith(
          'ERC20: burn amount exceeds balance',
        );
      });

      it('errors on send if ERC20 amount is zero', async () => {
        const zeroTx = deploy.bridgeRouter!.send(
          repr!.address,
          0,
          deploy.remoteDomain,
          deployerId,
        );

        await expect(zeroTx).to.be.revertedWith('cannot send 0');
      });

      it('burns tokens on outbound message', async () => {
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
      });

      it('errors on outbound messages with no balance', async () => {
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
    });

    describe('locally-originating asset roundtrip', async () => {
      let localTokenId: string;
      let transferAction: string;
      let transferMessage: string;
      let localToken: BridgeToken;

      before(async () => {
        deploy = await TestBridgeDeploy.deploy(deployer);

        localToken = await new BridgeToken__factory(deployer).deploy();
        await localToken.initialize();
        await localToken.mint(deployerAddress, TOKEN_VALUE);

        // generate protocol messages
        localTokenId = ethers.utils.hexConcat([
          deploy.localDomainBytes,
          toBytes32(localToken.address),
        ]);
        transferAction = ethers.utils.hexConcat([
          TRANSER_TAG,
          deployerId,
          TOKEN_VALUE_BYTES,
        ]);
        transferMessage = ethers.utils.hexConcat([
          localTokenId,
          transferAction,
        ]);

        expect(await localToken.balanceOf(deployerAddress)).to.equal(
          BigNumber.from(TOKEN_VALUE),
        );
        expect(
          await localToken.balanceOf(deploy.bridgeRouter!.address),
        ).to.equal(BigNumber.from(0));
      });

      it('errors if the token is not approved', async () => {
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
        expect(
          await localToken.balanceOf(deploy.bridgeRouter!.address),
        ).to.equal(BigNumber.from(0));
      });

      it('errors if insufficient balance', async () => {
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
        expect(
          await localToken.balanceOf(deploy.bridgeRouter!.address),
        ).to.equal(BigNumber.from(0));
      });
      it('holds tokens on outbound transfer', async () => {
        const sendTx = await deploy.bridgeRouter!.send(
          localToken.address,
          TOKEN_VALUE,
          deploy.remoteDomain,
          deployerId,
        );

        await expect(sendTx)
          .to.emit(deploy.mockCore, 'Enqueue')
          .withArgs(deploy.remoteDomain, deployerId, transferMessage);

        expect(
          await localToken.balanceOf(deploy.bridgeRouter!.address),
        ).to.equal(BigNumber.from(TOKEN_VALUE));
      });
      it('unlocks tokens on inbound transfer', async () => {
        let handleTx = await deploy.bridgeRouter!.handle(
          deploy.remoteDomain,
          deployerId,
          transferMessage,
          { gasLimit: PROTOCOL_PROCESS_GAS },
        );

        expect(handleTx).to.not.emit(deploy.bridgeRouter!, 'TokenDeployed');

        expect(
          await localToken.balanceOf(deploy.bridgeRouter!.address),
        ).to.equal(BigNumber.from(0));

        expect(await localToken.balanceOf(deployerAddress)).to.equal(
          BigNumber.from(TOKEN_VALUE),
        );
      });
    });
  });

  describe('prefill', async () => {
    before(async () => {
      deploy = await TestBridgeDeploy.deploy(deployer);
    });

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

    describe('remotely-originating asset', async () => {
      let setupAction: string;
      let setupMessage: string;
      let repr: IERC20;
      let recipient: string;
      let recipientId: string;
      let transferAction: string;
      let transferMessage: string;

      before(async () => {
        deploy = await TestBridgeDeploy.deploy(deployer);

        // generate actions
        recipient = `0x${'00'.repeat(19)}ff`;
        recipientId = toBytes32(recipient);
        transferAction = ethers.utils.hexConcat([
          TRANSER_TAG,
          recipientId,
          TOKEN_VALUE_BYTES,
        ]);
        transferMessage = ethers.utils.hexConcat([
          deploy.testTokenId,
          transferAction,
        ]);

        setupAction = ethers.utils.hexConcat([
          TRANSER_TAG,
          deployerId,
          TOKEN_VALUE_BYTES,
        ]);
        setupMessage = ethers.utils.hexConcat([
          deploy.testTokenId,
          setupAction,
        ]);

        // perform setup
        const setupTx = await deploy.bridgeRouter!.handle(
          deploy.remoteDomain,
          deployerId,
          setupMessage,
          { gasLimit: PROTOCOL_PROCESS_GAS },
        );

        await expect(setupTx).to.emit(deploy.bridgeRouter!, 'TokenDeployed');

        const representation = await deploy.getTestRepresentation();
        expect(representation).to.not.be.undefined;

        repr = representation!;
        expect(await repr.balanceOf(deployerAddress)).to.equal(
          BigNumber.from(TOKEN_VALUE),
        );
        await repr?.approve(
          deploy.bridgeRouter!.address,
          ethers.constants.MaxUint256,
        );
      });

      it('transfers tokens on a prefill', async () => {
        const prefillTx = await deploy.bridgeRouter!.preFill(transferMessage);
        await expect(prefillTx)
          .to.emit(repr, 'Transfer')
          .withArgs(
            deployerAddress,
            recipient,
            BigNumber.from(TOKEN_VALUE).mul(9995).div(10000),
          );
      });

      it('mints tokens for the liquidity provider on message receipt', async () => {
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
    });

    describe('locally-originating asset', async () => {
      let localToken: BridgeToken;
      let recipient: string;
      let recipientId: string;
      let localTokenId: string;
      let transferAction: string;
      let transferMessage: string;

      before(async () => {
        deploy = await TestBridgeDeploy.deploy(deployer);
        localToken = await new BridgeToken__factory(deployer).deploy();
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
        expect(
          await localToken.balanceOf(deploy.bridgeRouter!.address),
        ).to.equal(BigNumber.from(TOKEN_VALUE));

        // generate transfer action
        recipient = `0x${'00'.repeat(19)}ff`;
        recipientId = toBytes32(recipient);
        localTokenId = ethers.utils.hexConcat([
          deploy.localDomainBytes,
          toBytes32(localToken.address),
        ]);
        transferAction = ethers.utils.hexConcat([
          TRANSER_TAG,
          recipientId,
          TOKEN_VALUE_BYTES,
        ]);
        transferMessage = ethers.utils.hexConcat([
          localTokenId,
          transferAction,
        ]);
      });

      it('transfers tokens on prefill', async () => {
        const prefillTx = await deploy.bridgeRouter!.preFill(transferMessage);
        await expect(prefillTx)
          .to.emit(localToken, 'Transfer')
          .withArgs(
            deployerAddress,
            recipient,
            BigNumber.from(TOKEN_VALUE).mul(9995).div(10000),
          );
      });

      it('unlocks tokens on message receipt', async () => {
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

  describe('details message', async () => {
    let localToken: BridgeToken;
    let requestMessage: string;
    let outgoingDetails: string;
    let incomingDetails: string;
    let transferMessage: string;
    let repr: BridgeToken;

    const TEST_NAME = 'TEST TOKEN';
    const TEST_SYMBOL = 'TEST';
    const TEST_DECIMALS = 8;

    before(async () => {
      deploy = await TestBridgeDeploy.deploy(deployer);
      localToken = await new BridgeToken__factory(deployer).deploy();
      await localToken.initialize();
      await localToken.setDetails(TEST_NAME, TEST_SYMBOL, TEST_DECIMALS);

      requestMessage = ethers.utils.hexConcat([
        deploy.localDomainBytes,
        toBytes32(localToken.address),
        typeToByte(BRIDGE_MESSAGE_TYPES.REQUEST_DETAILS),
      ]);
      outgoingDetails = ethers.utils.hexConcat([
        deploy.localDomainBytes,
        toBytes32(localToken.address),
        typeToByte(BRIDGE_MESSAGE_TYPES.DETAILS),
        stringToBytes32(TEST_NAME),
        stringToBytes32(TEST_SYMBOL),
        [TEST_DECIMALS],
      ]);

      // generate transfer action
      const transferAction = ethers.utils.hexConcat([
        TRANSER_TAG,
        deployerId,
        TOKEN_VALUE_BYTES,
      ]);
      transferMessage = ethers.utils.hexConcat([
        deploy.testTokenId,
        transferAction,
      ]);

      incomingDetails = ethers.utils.hexConcat([
        deploy.testTokenId,
        typeToByte(BRIDGE_MESSAGE_TYPES.DETAILS),
        stringToBytes32(TEST_NAME),
        stringToBytes32(TEST_SYMBOL),
        [TEST_DECIMALS],
      ]);

      // first send in a transfer to create the repr
      await deploy.bridgeRouter!.handle(
        deploy.remoteDomain,
        deployerId,
        transferMessage,
      );

      const representation = await deploy.getTestRepresentation();
      expect(representation).to.not.be.undefined;
      repr = representation!;
    });

    it('allows admins to dispatch requestDetails', async () => {
      const requestTx = await deploy.bridgeRouter!.requestDetails(
        deploy.remoteDomain,
        deploy.testToken,
      );

      await expect(requestTx)
        .to.emit(deploy.mockCore, 'Enqueue')
        .withArgs(
          deploy.remoteDomain,
          deployerId,
          ethers.utils.hexConcat([
            deploy.testTokenId,
            typeToByte(BRIDGE_MESSAGE_TYPES.REQUEST_DETAILS),
          ]),
        );
    });

    it('handles incoming requestDetails by dispatching a details message', async () => {
      const handleTx = deploy.bridgeRouter!.handle(
        deploy.remoteDomain,
        deployerId,
        requestMessage,
      );

      await expect(handleTx)
        .to.emit(deploy.mockCore, 'Enqueue')
        .withArgs(deploy.remoteDomain, deployerId, outgoingDetails);
    });

    it('errors if token is a repr', async () => {
      const badRequest = ethers.utils.hexConcat([
        deploy.localDomainBytes,
        toBytes32(repr.address),
        typeToByte(BRIDGE_MESSAGE_TYPES.REQUEST_DETAILS),
      ]);

      let badRequestTx = deploy.bridgeRouter?.handle(
        deploy.remoteDomain,
        deployerId,
        badRequest,
      );

      await expect(badRequestTx).to.be.revertedWith('!local origin');
    });

    it('errors if no registered router for response', async () => {
      const badRequest = ethers.utils.hexConcat([
        deploy.localDomainBytes,
        localToken.address,
        typeToByte(BRIDGE_MESSAGE_TYPES.REQUEST_DETAILS),
      ]);

      let badRequestTx = deploy.bridgeRouter?.handle(
        3812,
        deployerId,
        badRequest,
      );

      await expect(badRequestTx).to.be.revertedWith('!remote router');
    });

    it('sets details during details message handling', async () => {
      // repr should not be configured
      expect((await repr.name()).length).to.be.greaterThan(32);
      expect((await repr.symbol()).length).to.equal(32);
      expect(await repr.decimals()).to.equal(18);

      await deploy.bridgeRouter!.handle(
        deploy.remoteDomain,
        deployerId,
        incomingDetails,
      );

      expect(await repr.name()).to.equal(TEST_NAME);
      expect(await repr.symbol()).to.equal(TEST_SYMBOL);
      expect(await repr.decimals()).to.equal(TEST_DECIMALS);
    });
  });

  describe('custom token representations', async () => {
    let transferMessage: string;
    let defaultRepr: BridgeToken;
    let customRepr: BridgeToken;
    const VALUE = `0x${'00'.repeat(24)}ffffffffffffffff`;

    before(async () => {
      deploy = await TestBridgeDeploy.deploy(deployer);
      // generate transfer action
      const transferAction = ethers.utils.hexConcat([
        TRANSER_TAG,
        deployerId,
        VALUE,
      ]);
      transferMessage = ethers.utils.hexConcat([
        deploy.testTokenId,
        transferAction,
      ]);

      // first send in a transfer to create the repr
      await deploy.bridgeRouter!.handle(
        deploy.remoteDomain,
        deployerId,
        transferMessage,
      );

      const representation = await deploy.getTestRepresentation();
      expect(representation).to.not.be.undefined;
      defaultRepr = representation!;
      expect(await defaultRepr.balanceOf(deployerAddress)).to.equal(
        BigNumber.from(VALUE),
      );

      // setup custom
      customRepr = await new BridgeToken__factory(deployer).deploy();
      await customRepr.initialize();
      expect(await customRepr.balanceOf(deployerAddress)).to.equal(
        BigNumber.from(0),
      );
    });

    it('errors if no mint/burn privilieges', async () => {
      const enrollTx = deploy.bridgeRouter!.enrollCustom(
        deploy.remoteDomain,
        deploy.testToken,
        customRepr.address,
      );

      await expect(enrollTx).to.be.revertedWith(
        'Ownable: caller is not the owner',
      );
    });

    it('registers the custom token', async () => {
      await customRepr.transferOwnership(deploy.bridgeRouter!.address);

      const enrollTx = deploy.bridgeRouter!.enrollCustom(
        deploy.remoteDomain,
        deploy.testToken,
        customRepr.address,
      );

      await expect(enrollTx).to.not.be.reverted;
      expect(
        await deploy.bridgeRouter!['getLocalAddress(uint32,bytes32)'](
          deploy.remoteDomain,
          deploy.testToken,
        ),
      ).to.equal(customRepr.address);

      let [domain, token] = await deploy.bridgeRouter!.getCanonicalAddress(
        customRepr.address,
      );
      expect(domain).to.equal(deploy.remoteDomain);
      expect(token).to.equal(deploy.testToken);

      [domain, token] = await deploy.bridgeRouter!.getCanonicalAddress(
        defaultRepr.address,
      );
      expect(domain).to.equal(deploy.remoteDomain);
      expect(token).to.equal(deploy.testToken);
    });

    it('mints incoming tokens in the custom repr', async () => {
      const defaultBalance = await defaultRepr.balanceOf(deployerAddress);

      // first send in a transfer to create the repr
      await deploy.bridgeRouter!.handle(
        deploy.remoteDomain,
        deployerId,
        transferMessage,
      );
      // did not mint default
      expect(await defaultRepr.balanceOf(deployerAddress)).to.equal(
        defaultBalance,
      );
      // did mint custom
      expect(await customRepr.balanceOf(deployerAddress)).to.equal(
        BigNumber.from(VALUE),
      );
    });

    it('allows outbound transfers of both assets', async () => {
      const smallTransferAction = ethers.utils.hexConcat([
        TRANSER_TAG,
        deployerId,
        TOKEN_VALUE_BYTES,
      ]);
      const smallTransferMessage = ethers.utils.hexConcat([
        deploy.testTokenId,
        smallTransferAction,
      ]);

      const defaultSendTx = await deploy.bridgeRouter!.send(
        defaultRepr.address,
        TOKEN_VALUE,
        deploy.remoteDomain,
        deployerId,
      );
      await expect(defaultSendTx)
        .to.emit(deploy.mockCore, 'Enqueue')
        .withArgs(deploy.remoteDomain, deployerId, smallTransferMessage);

      const customSendTx = await deploy.bridgeRouter!.send(
        customRepr.address,
        TOKEN_VALUE,
        deploy.remoteDomain,
        deployerId,
      );
      await expect(customSendTx)
        .to.emit(deploy.mockCore, 'Enqueue')
        .withArgs(deploy.remoteDomain, deployerId, smallTransferMessage);
    });

    it('allows users to migrate', async () => {
      const defaultBalance = await defaultRepr.balanceOf(deployerAddress);
      const customBalance = await customRepr.balanceOf(deployerAddress);

      let migrateTx = deploy.bridgeRouter!.migrate(defaultRepr.address);

      await expect(migrateTx)
        .to.emit(deploy.bridgeRouter, 'Migrate')
        .withArgs(
          deploy.remoteDomain,
          deploy.testToken,
          deployerAddress,
          defaultBalance,
          defaultRepr.address,
          customRepr.address,
        );

      expect(await defaultRepr.balanceOf(deployerAddress)).to.equal(
        ethers.constants.Zero,
      );
      expect(await customRepr.balanceOf(deployerAddress)).to.equal(
        defaultBalance.add(customBalance),
      );
    });
  });
});

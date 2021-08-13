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

const BRIDGE_MESSAGE_TYPES = {
  INVALID: 0,
  TOKEN_ID: 1,
  MESSAGE: 2,
  TRANSFER: 3,
  DETAILS: 4,
  REQUEST_DETAILS: 5,
};

const typeToBytes = (type: number) => `0x0${type}`;

describe.only('BridgeRouter', async () => {
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

  describe('transfer message', async () => {
    before(async () => {
      deploy = await TestBridgeDeploy.deploy(deployer);
    });

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
              typeToBytes(BRIDGE_MESSAGE_TYPES.REQUEST_DETAILS),
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

  describe.skip('details message', async () => {
    before(async () => {});
    it('should dispatch a message on incoming requestDetails message');
    it('should allow admins to dispatch requestDetails');
    it('should set details on message handling', async () => {});
  });
  describe.skip('custom token representations', async () => {
    before(async () => {});
    it('should error if no mint/burn privilieges', async () => {});
    it('should register the custom token', async () => {});
    it('should allow outbound transfers of both assets', async () => {});
    it('should allow users to migrate', async () => {});
    it('should mint incoming tokens in the custom repr', async () => {});
  });
});

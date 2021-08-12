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

describe('Bridge', async () => {
  let deployer: Signer;
  let deployerAddress: String;
  let deployerId: BytesLike;
  let deploy: TestBridgeDeploy;
  let transferAction: BytesLike;
  let transferMessage: BytesLike;

  const DOMAIN = 1;

  // 4-byte domain ID
  const DOMAIN_BYTES = `0x0000000${DOMAIN}`;

  // 1-byte Action Type
  const TRANSFER_BYTES = typeToBytes(BRIDGE_MESSAGE_TYPES.TRANSFER);

  // 32-byte token address
  const CANONICAL_TOKEN_ADDRESS = `0x${'11'.repeat(32)}`;

  // 36 byte token id
  const TOKEN_ID = ethers.utils.concat([DOMAIN_BYTES, CANONICAL_TOKEN_ADDRESS]);

  // 32-byte token value
  const TOKEN_VALUE = `0x${'00'.repeat(30)}ffff`;

  before(async () => {
    // populate deployer signer
    [deployer] = await ethers.getSigners();
    deployerAddress = await deployer.getAddress();
    deployerId = toBytes32(await deployer.getAddress());
    // run test deploy of bridge contracts
    deploy = await TestBridgeDeploy.deploy(deployer);

    // generate transfer action
    transferAction = ethers.utils.concat([
      TRANSFER_BYTES,
      deployerId,
      TOKEN_VALUE,
    ]);
    transferMessage = ethers.utils.concat([TOKEN_ID, transferAction]);
  });

  it('handles a transfer message', async () => {
    // first handle message for a new canonical token should deploy a representation token contract
    expect(
      await deploy.bridgeRouter!.handle(DOMAIN, deployerId, transferMessage),
    ).to.emit(deploy.bridgeRouter!, 'TokenDeployed');

    const repr = await deploy.getRepresentation(
      DOMAIN,
      CANONICAL_TOKEN_ADDRESS,
    );

    expect(repr).to.not.be.undefined;

    expect(await repr!.balanceOf(deployer.address)).to.equal(
      BigNumber.from(TOKEN_VALUE),
    );
    expect(await repr!.totalSupply()).to.equal(BigNumber.from(TOKEN_VALUE));
  });
});

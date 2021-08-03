import { BigNumber, BigNumberish, Bytes, ethers } from 'ethers';
import { BridgeToken } from '../../typechain/optics-xapps';

const PERMIT_TYPEHASH = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes(
    'Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)',
  ),
);

export type Approval = {
  owner: string;
  spender: string;
  value: BigNumberish;
  deadline: BigNumberish;
};

export async function permitDigest(
  token: BridgeToken,
  approval: Approval,
): Promise<string> {
  const name = await token.name();
  const separator = await token.domainSeparator();
  const nonce = await token.nonces(approval.owner);

  return ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
      [
        '0x19', // prefix
        '0x01', // version
        separator,
        ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
            [
              PERMIT_TYPEHASH,
              ethers.utils.getAddress(approval.owner),
              ethers.utils.getAddress(approval.spender),
              BigNumber.from(approval.value),
              nonce,
              BigNumber.from(approval.deadline),
            ],
          ),
        ),
      ],
    ),
  );
}

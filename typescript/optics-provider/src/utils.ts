import { BytesLike } from '@ethersproject/bytes';
import { ethers } from 'ethers';

export type Address = string;

// ensure that a bytes-like is 32 long. left-pad with 0s if not
export function canonizeId(data: BytesLike): Uint8Array {
  const buf = ethers.utils.arrayify(data);
  if (buf.length > 32) {
    throw new Error('Too long');
  }
  if (buf.length !== 20 && buf.length != 32) {
    throw new Error('bad input, expect address or bytes32');
  }
  return ethers.utils.zeroPad(buf, 32);
}

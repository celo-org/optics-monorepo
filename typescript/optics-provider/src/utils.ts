import { BytesLike } from '@ethersproject/bytes';
import { id } from '@ethersproject/hash';
import { ethers } from 'ethers';

// ensure that a bytes-like is 32 long. left-pad with 0s if not
export function canonizeId(data: BytesLike): Uint8Array {
  const buf = ethers.utils.arrayify(data);
  if (buf.length > 32) {
    throw new Error('Too long');
  }
  return ethers.utils.zeroPad(buf, 32);
}

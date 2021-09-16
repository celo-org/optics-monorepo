import { BytesLike } from 'ethers';
import { xapps } from '@optics-xyz/ts-interface';
import wellKnown from './well-known';

export interface TokenIdentifier {
  domain: string | number;
  id: BytesLike;
}

export type ResolvedTokenInfo = {
  // The canonical domain
  domain: number;
  // The canonical identifier
  id: BytesLike;
  // The contract on each chain
  tokens: Map<number, xapps.ERC20>;
};

export const tokens = wellKnown;
export default tokens;

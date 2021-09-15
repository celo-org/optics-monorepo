import { BytesLike } from 'ethers';
import { ERC20 } from '@optics-xyz/ts-interface/optics-xapps';

export interface TokenIdentifier {
  domain: string | number;
  id: BytesLike;
}

export type ResolvedTokenInfo = {
  domain: number;
  id: BytesLike;
  tokens: Map<number, ERC20>;
};

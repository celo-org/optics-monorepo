import { BytesLike } from 'ethers';
import { ERC20 } from '@optics-xyz/ts-interface/optics-xapps';

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
  tokens: Map<number, ERC20>;
};

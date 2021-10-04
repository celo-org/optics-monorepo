export type MetamaskNetwork = {
  chainId: string;
  chainName: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  iconUrls: string[];
};

export const CELO_PARAMS: MetamaskNetwork = {
  chainId: '0xa4ec',
  chainName: 'Celo',
  nativeCurrency: { name: 'Celo', symbol: 'CELO', decimals: 18 },
  rpcUrls: ['https://forno.celo.org'],
  blockExplorerUrls: ['https://explorer.celo.org/'],
  iconUrls: ['future'],
};

export const ALFAJORES_PARAMS: MetamaskNetwork = {
  chainId: '0xaef3',
  chainName: 'Alfajores Testnet',
  nativeCurrency: { name: 'Alfajores Celo', symbol: 'A-CELO', decimals: 18 },
  rpcUrls: ['https://alfajores-forno.celo-testnet.org'],
  blockExplorerUrls: ['https://alfajores-blockscout.celo-testnet.org/'],
  iconUrls: ['future'],
};

export const BAKLAVA_PARAMS: MetamaskNetwork = {
  chainId: '0xf370',
  chainName: 'Baklava Testnet',
  nativeCurrency: { name: 'Baklava Celo', symbol: 'B-CELO', decimals: 18 },
  rpcUrls: ['https://baklava-forno.celo-testnet.org'],
  blockExplorerUrls: ['https://baklava-blockscout.celo-testnet.org/'],
  iconUrls: ['future'],
};

export async function connect(params: MetamaskNetwork): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.ethereum) {
    await w.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [params],
    });
  }
}

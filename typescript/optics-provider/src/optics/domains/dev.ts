import { OpticsDomain } from './domain';

export const alfajores: OpticsDomain = {
  name: 'alfajores',
  id: 1000,
  bridgeRouter: '0xDBbe03850fDF986Df1C8f1D856012f80A1f98eCc',
  home: '0x01652e694BbD82C0900776c0406C3DFaa00e1e91',
  replicas: [
    { domain: 2000, address: '0xB4ceF5bd5328c42F3f09b9A43F6010ea93f145f1' },
    {
      domain: 3000,
      address: '0xB5EB71E40bcAEAD5DDdc7687724f9F155Fd1a7a8',
    },
  ],
};

export const kovan: OpticsDomain = {
  name: 'kovan',
  id: 3000,
  bridgeRouter: '0xA763Db23711537D7074392b16E84eb04993C9f5d',
  ethHelper: '0x90b6A931Cf35a1ba72E8959948d0E041320Fa704',
  home: '0x0ED518F19fEbbd3737e39a55a8a708AFe8a9BE59',
  replicas: [
    { domain: 2000, address: '0x6776ef96A04a40a4dCB835D42bF59649aA9daFeA' },
    {
      domain: 1000,
      address: '0xC6b39Ac67FBE3e029708390ffea130c8C0E7D30b',
    },
  ],
};

export const rinkeby: OpticsDomain = {
  name: 'rinkeby',
  id: 2000,
  bridgeRouter: '0x926Df2b652bC8273BB2F06E8de135875bbE1D271',
  ethHelper: '0x4e52f7e2F9f3B592dcfBD8957d36973a0308d1eF',
  home: '0xDf4c0d67489F945C1e52440Ef8F203F4CE6e4176',
  replicas: [
    { domain: 1000, address: '0x7f41a2A1D97DD5F75B6FF6E1b012f686fE8121E4' },
    {
      domain: 3000,
      address: '0x72877419567cd7f697A6a5F2f7dF3e07327Ea7B2',
    },
  ],
};

export const devDomains = [alfajores, kovan, rinkeby];

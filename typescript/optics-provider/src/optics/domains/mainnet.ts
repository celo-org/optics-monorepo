import { OpticsDomain } from './domain';
import { OpticsDomain } from './domain';

export const ethereum: OpticsDomain = {
  name: 'ethereum',
  id: 6648936,
  bridgeRouter: '0x6a39909e805A3eaDd2b61fFf61147796ca6aBB47',
  ethHelper: '0xf1c1413096ff2278C3Df198a28F8D54e0369cF3A',
  home: '0xf25C5932bb6EFc7afA4895D9916F2abD7151BF97',
  replicas: [
    {
      domain: 1667591279,
      address: '0x07b5B57b08202294E657D51Eb453A189290f6385',
    },
    {
      domain: 1886350457,
      address: '0x7725EadaC5Ee986CAc8317a1d2fB16e59e079E8b',
    },
  ],
};

export const polygon: OpticsDomain = {
  name: 'polygon',
  id: 1886350457,
  paginate: {
    // This needs to be stupidly low to avoid RPC timeouts
    blocks: 100,
    from: 18895794,
  },
  bridgeRouter: '0xf244eA81F715F343040569398A4E7978De656bf6',
  ethHelper: '0xc494bFEE14b5E1E118F93CfedF831f40dFA720fA',
  home: '0x97bbda9A1D45D86631b243521380Bc070D6A4cBD',
  replicas: [
    { domain: 6648936, address: '0xf25C5932bb6EFc7afA4895D9916F2abD7151BF97' },
    {
      domain: 1667591279,
      address: '0x681Edb6d52138cEa8210060C309230244BcEa61b',
    },
  ],
};

export const celo: OpticsDomain = {
  name: 'celo',
  id: 1667591279,
  bridgeRouter: '0xf244eA81F715F343040569398A4E7978De656bf6',
  home: '0x97bbda9A1D45D86631b243521380Bc070D6A4cBD',
  replicas: [
    { domain: 6648936, address: '0xf25c5932bb6efc7afa4895d9916f2abd7151bf97' },
    {
      domain: 1886350457,
      address: '0x681Edb6d52138cEa8210060C309230244BcEa61b',
    },
  ],
};

export const mainnetDomains = [ethereum, celo, polygon];

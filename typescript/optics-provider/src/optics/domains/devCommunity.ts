import { OpticsDomain } from './domain';

export const alfajores: OpticsDomain = {
  name: 'alfajores',
  id: 1000,
  bridgeRouter: '0x684C74fBA4dF7F7A542709C5f9688AB806C7B828',
  home: '0xeA057840858645bb68134a913A252a44a0C58652',
  replicas: [
    { domain: 5, address: '0x3354D5956612C38D0dD831dcdf83CF30BC674231' },
    { domain: 3000, address: '0x6AdB8ba7C826d70506D26eDdc74236fB88Fa647F' },
    { domain: 43113, address: '0x570EDeF0c271E3f1ba6B5C66D040195750a79762' },
    { domain: 80001, address: '0xbA00eF80A55d4EefcF3d7971270D2c233F9d315e' },
  ],
};

export const kovan: OpticsDomain = {
  name: 'kovan',
  id: 3000,
  bridgeRouter: '0x53d09A4B49443F7f7C66321C306601dC9d483D4F',
  ethHelper: '0xFE7c9Cc7116429Ae50823a218315C7E01EC7A761',
  home: '0xc53F82FAF17B4c521A85C514791593847Bdf1655',
  replicas: [
    { domain: 5, address: '0xc501ad2163Ebd9921B4a6E46B344Ef7bA76A2cBa' },
    { domain: 1000, address: '0xEdDA4762fe6388C69d37b8Ee15B1deC10cA3B964' },
    { domain: 43113, address: '0xf3855B99b7cEfa56C66f0C2d0550b545df11d54A' },
    { domain: 80001, address: '0xeAc82476aF67dca63B04a66EA8D7230EfB4028DB' },
  ],
};

export const gorli: OpticsDomain = {
  name: 'gorli',
  id: 5,
  bridgeRouter: '0x53d09A4B49443F7f7C66321C306601dC9d483D4F',
  ethHelper: '0xFE7c9Cc7116429Ae50823a218315C7E01EC7A761',
  home: '0xc53F82FAF17B4c521A85C514791593847Bdf1655',
  replicas: [
    { domain: 1000, address: '0xEdDA4762fe6388C69d37b8Ee15B1deC10cA3B964' },
    { domain: 3000, address: '0xc501ad2163Ebd9921B4a6E46B344Ef7bA76A2cBa' },
    { domain: 43113, address: '0xf3855B99b7cEfa56C66f0C2d0550b545df11d54A' },
    { domain: 80001, address: '0xeAc82476aF67dca63B04a66EA8D7230EfB4028DB' },
  ],
};

export const fuji: OpticsDomain = {
  name: 'fuji',
  id: 43113,
  bridgeRouter: '0xFE7c9Cc7116429Ae50823a218315C7E01EC7A761',
  ethHelper: '0x7B99a9cf26c9813b16E3DDb3D6E593c3624c9EBA',
  home: '0xc53F82FAF17B4c521A85C514791593847Bdf1655',
  replicas: [
    { domain: 5, address: '0xf3855B99b7cEfa56C66f0C2d0550b545df11d54A' },
    { domain: 1000, address: '0xEdDA4762fe6388C69d37b8Ee15B1deC10cA3B964' },
    { domain: 3000, address: '0xc501ad2163Ebd9921B4a6E46B344Ef7bA76A2cBa' },
    { domain: 80001, address: '0xeAc82476aF67dca63B04a66EA8D7230EfB4028DB' },
  ],
};

export const mumbai: OpticsDomain = {
  name: 'mumbai',
  id: 80001,
  bridgeRouter: '0xFE7c9Cc7116429Ae50823a218315C7E01EC7A761',
  ethHelper: '0x7B99a9cf26c9813b16E3DDb3D6E593c3624c9EBA',
  home: '0xc53F82FAF17B4c521A85C514791593847Bdf1655',
  replicas: [
    { domain: 5, address: '0xf3855B99b7cEfa56C66f0C2d0550b545df11d54A' },
    { domain: 1000, address: '0xEdDA4762fe6388C69d37b8Ee15B1deC10cA3B964' },
    { domain: 3000, address: '0xc501ad2163Ebd9921B4a6E46B344Ef7bA76A2cBa' },
    { domain: 43113, address: '0xeAc82476aF67dca63B04a66EA8D7230EfB4028DB' },
  ],
};

export const devCommunityDomains = [alfajores, kovan, gorli, fuji, mumbai];
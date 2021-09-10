import { OpticsDomain } from './domain';

export const alfajores: OpticsDomain = {
  name: 'alfajores',
  domain: 1000,
  bridgeRouter: '0xd6930Ee55C141E5Bb4079d5963cF64320956bb3E',
  home: '0x47AaF05B1C36015eC186892C43ba4BaF91246aaA',
  replicas: [
    { domain: 2000, address: '0x7804079cF55110dE7Db5aA67eB1Be00cBE9CA526' },
    {
      domain: 3000,
      address: '0x6B8D6947B9b70f3ff1b547a15B969F625d28104a',
    },
  ],
};

export const kovan: OpticsDomain = {
  name: 'kovan',
  domain: 3000,
  bridgeRouter: '0x359089D34687bDbFD019fCC5093fFC21bE9905f5',
  ethHelper: '0x411ABcFD947212a0D64b97C9882556367b61704a',
  home: '0x5B55C29A10aEe6D5750F128C6a8f490de763ccc7',
  replicas: [
    { domain: 2000, address: '0xC1AB4d72548Cc1C248EAdcD340035C3b213a47C3' },
    {
      domain: 1000,
      address: '0xE63E73339501EE3A8d2928d6C88cf30aC8556Ee0',
    },
  ],
};

export const rinkeby: OpticsDomain = {
  name: 'rinkeby',
  domain: 2000,
  bridgeRouter: '0x8FbEA25D0bFDbff68F2B920df180e9498E9c856A',
  ethHelper: '0x1BEBC8F1260d16EE5d1CFEE9366bB474bD13DC5f',
  home: '0x6E6010E6bd43a9d2F7AE3b7eA9f61760e58758f3',
  replicas: [
    { domain: 1000, address: '0x6A5F9531D1877ebE96Bc0631DbF64BBCf1f7421c' },
    {
      domain: 3000,
      address: '0x6554bc7a5C35bA64Bf48FA8a9e662d8808aaa890',
    },
  ],
};

export const stagingDomains = [alfajores, kovan, rinkeby];

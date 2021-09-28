import { OpticsDomain } from './domain';

export const alfajores: OpticsDomain = {
  name: 'alfajores',
  id: 1000,
  bridgeRouter: '0xdaa6e362f9BE0CDaCe107b298639034b8dEC617a',
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
  id: 3000,
  bridgeRouter: '0x383Eb849c707fE38f3DfBF45679C0c6f21Ba82fF',
  ethHelper: '0x6D84B823D7FB68E4d6f7Cc334fDd393f6C3a6980',
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
  id: 2000,
  bridgeRouter: '0xE9fB0b6351Dec7d346282b8274653D36b8199AAF',
  ethHelper: '0x7a539d7B7f4Acab1d7ce8b3681c3e286511ee444',
  home: '0x6E6010E6bd43a9d2F7AE3b7eA9f61760e58758f3',
  replicas: [
    { domain: 1000, address: '0x6A5F9531D1877ebE96Bc0631DbF64BBCf1f7421c' },
    {
      domain: 3000,
      address: '0x6554bc7a5C35bA64Bf48FA8a9e662d8808aaa890',
    },
  ],
};

export const devDomains = [alfajores, kovan, rinkeby];

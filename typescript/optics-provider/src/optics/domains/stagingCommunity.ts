import { OpticsDomain } from './domain';

export const alfajores: OpticsDomain = {
  name: 'alfajores',
  id: 1000,
  bridgeRouter: '0xe29Abbc3669064d8aF9F6BE378179a133664a92C',
  home: '0xDf89d5d4039ada018BCDb992Bb6C2e05fEf86328',
  replicas: [
    {
      domain: 3, // ropsten
      address: '0xC9e581Cd4fF6533f5ccBA4Dc5d5f642B8b658B93'
    },
    {
      domain: 3000, // kovan
      address: '0x15fA9169F7495162ac52b4A7957c9054097Ab0FF',
    },
    {
      domain: 5, // gorli
      address: '0x4eAD31e37b950B32b9EBbE747f0ef4BffAc336a5',
    },
  ],
};

export const ropsten: OpticsDomain = {
  name: 'ropsten',
  id: 3,
  bridgeRouter: '0xe29Abbc3669064d8aF9F6BE378179a133664a92C',
  ethHelper: '0x9A0e88a3D8CF09F3dc5Ba65640299DE3D87f926C',
  home: '0x7E26E170dB94E81979927d2D39CB703048Ad599D',
  replicas: [
    {
      domain: 1000, // alfajores
      address: '0x30dAE25E9eBd644841d1A1fF25e303331B1CdEb3'
    },
    {
      domain: 3000, // kovan
      address: '0xF782C67AA111a9D75f6ccEf3d7aDB54620D5A8e9',
    },
    {
      domain: 5, // gorli
      address: '0x15C1edbf6E6161d50d58682dF7587F0d61db5C38',
    },
  ],
};

export const kovan: OpticsDomain = {
  name: 'kovan',
  id: 3000,
  bridgeRouter: '0x9A0e88a3D8CF09F3dc5Ba65640299DE3D87f926C',
  ethHelper: '0x8c7510966c0312dEb2305A5E1C923CE48bbf55Ce',
  home: '0x7E26E170dB94E81979927d2D39CB703048Ad599D',
  replicas: [
    {
      domain: 1000, // alfajores
      address: '0x30dAE25E9eBd644841d1A1fF25e303331B1CdEb3'
    },
    {
      domain: 3, // ropsten
      address: '0x15C1edbf6E6161d50d58682dF7587F0d61db5C38',
    },
    {
      domain: 5, // gorli
      address: '0xF782C67AA111a9D75f6ccEf3d7aDB54620D5A8e9',
    },
  ],
};

export const gorli: OpticsDomain = {
    name: 'gorli',
    id: 5,
    bridgeRouter: '0xe29Abbc3669064d8aF9F6BE378179a133664a92C',
    ethHelper: '0x9A0e88a3D8CF09F3dc5Ba65640299DE3D87f926C',
    home: '0xDf89d5d4039ada018BCDb992Bb6C2e05fEf86328',
    replicas: [
      {
        domain: 1000, // alfajores
        address: '0x15fA9169F7495162ac52b4A7957c9054097Ab0FF'
      },
      {
        domain: 3, // ropsten
        address: '0xC9e581Cd4fF6533f5ccBA4Dc5d5f642B8b658B93',
      },
      {
        domain: 3000, // kovan
        address: '0x4eAD31e37b950B32b9EBbE747f0ef4BffAc336a5',
      },
    ],
};

export const stagingCommunityDomains = [alfajores, kovan, ropsten, gorli];

import { mainnet } from '.';

const celoRpc = 'https://forno.celo.org';

const polygonRpc =
  'https://polygon-mainnet.infura.io/v3/58bafb6c28e6439c9e7d8bb8e83592e2';

const ethRpc = 'https://mainnet.infura.io/v3/58bafb6c28e6439c9e7d8bb8e83592e2';

mainnet.registerRpcProvider('celo', celoRpc);
mainnet.registerRpcProvider('ethereum', ethRpc);
mainnet.registerRpcProvider('polygon', polygonRpc);

export const mn = mainnet;

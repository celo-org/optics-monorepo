import * as dotenv from 'dotenv';
dotenv.config();

export default {
  celoRpc: process.env.CELO_RPC ?? '',
  ethereumRpc: process.env.ETHEREUM_RPC ?? '',
  polygonRpc: process.env.POLYGON_RPC ?? '',
  alfajoresRpc: process.env.ALFAJORES_RPC ?? '',
  kovanRpc: process.env.KOVAN_RPC ?? '',
  rinkebyRpc: process.env.RINKEBY_RPC ?? '',
  googleCredentialsFile:
    process.env.GOOGLE_CREDENTIALS_FILE ?? './credentials.json',
};

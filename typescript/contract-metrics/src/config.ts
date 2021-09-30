import * as dotenv from 'dotenv';
dotenv.config();

export default {
  celoRpc: process.env.CELO_RPC ?? '',
  ethereumRpc: process.env.ETHEREUM_RPC ?? '',
  polygonRpc: process.env.POLYGON_RPC ?? '',
  googleCredentialsFile:
    process.env.GOOGLE_CREDENTIALS_FILE ?? './credentials.json',
};

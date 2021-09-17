import * as dotenv from 'dotenv';

dotenv.config({ path: __dirname+'/.env' });

export default {
    CeloRpc: process.env.CELO_RPC ?? '',
    EthereumRpc: process.env.ETHEREUM_RPC ?? '',
    PolygonRpc: process.env.POLYGON_RPC ?? ''
}
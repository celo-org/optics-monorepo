import * as dotenv from 'dotenv';
import { processSendEvents } from './events';

dotenv.config({ path: __dirname+'/.env' });

export default {
    CeloRpc: process.env.CELO_RPC ?? '',
    EthereumRpc: process.env.ETHEREUM_RPC ?? '',
    PolygonRpc: process.env.POLYGON_RPC ?? '',
    GoogleCredentialsFile: process.env.GOOGLE_CREDENTIALS_FILE ?? './credentials.json'
}
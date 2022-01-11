import * as dotenv from 'dotenv';
import Logger from 'bunyan';
import { MetricCollector } from './metrics';

dotenv.config({path: process.env.CONFIG_PATH ?? '.env'});

const environment = process.env.ENVIRONMENT ?? 'development'

let networks = []
switch (environment) {
  case 'production':
    networks = ['celo', 'ethereum', 'polygon', 'avalanche']
    break;

  default:
    networks = ['alfajores', 'rinkeby', 'kovan']
    break;
}

const baseLogger = Logger.createLogger({
  name: 'contract-metrics',
  serializers: Logger.stdSerializers,
  level: 'debug',
  environment: environment
})

const metrics = new MetricCollector(baseLogger)

export default {
  baseLogger: baseLogger,
  metrics: metrics,
  networks: networks,
  environment: environment,
  celoRpc: process.env.CELO_RPC ?? '',
  ethereumRpc: process.env.ETHEREUM_RPC ?? '',
  polygonRpc: process.env.POLYGON_RPC ?? '',
  avalancheRpc: process.env.AVALANCHE_RPC ?? '',
  alfajoresRpc: process.env.ALFAJORES_RPC ?? '',
  kovanRpc: process.env.KOVAN_RPC ?? '',
  rinkebyRpc: process.env.RINKEBY_RPC ?? '',
  googleCredentialsFile:
    process.env.GOOGLE_CREDENTIALS_FILE ?? './credentials.json'
};

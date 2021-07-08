import {ChainConfig, OpticsChainConfig} from "../src/chain";
import * as dotenv from 'dotenv';
dotenv.config();

export const alfajores:ChainConfig = {
    name: 'alfajores',
    rpc: "https://alfajores-forno.celo-testnet.org",
    deployerKey: process.env.ALFAJORES_DEPLOYER_KEY,
};

export const opticsAlfajores:OpticsChainConfig = {
    ...alfajores,
    domain: 1000,
    updater: '0x4177372FD9581ceb2367e0Ce84adC5DAD9DF8D55',
    watchers: ['0x20aC2FD664bA5406A7262967C34107e708dCb18E'],
    recoveryManager: '0x24F6c874F56533d9a1422e85e5C7A806ED11c036',
    optimisticSeconds: 10,
    recoveryTimelock: 180,
};
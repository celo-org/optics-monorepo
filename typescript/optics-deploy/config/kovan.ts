import {ChainConfig, OpticsChainConfig} from "../src/chain";
import * as dotenv from 'dotenv';
dotenv.config();

export const kovan:ChainConfig = {
    name: 'kovan',
    rpc: "https://kovan.infura.io/v3/5c456d7844fa40a683e934df60534c60",
    deployerKey: process.env.KOVAN_DEPLOYER_KEY,
};

export const opticsKovan:OpticsChainConfig = {
    ...kovan,
    domain: 3000,
    updater: '0x4177372FD9581ceb2367e0Ce84adC5DAD9DF8D55',
    optimisticSeconds: 10,
    watchers: ['0x20aC2FD664bA5406A7262967C34107e708dCb18E'],
    gasPrice: 10_000_000_000,
    recoveryTimelock: 180,
    recoveryManager: '0x24F6c874F56533d9a1422e85e5C7A806ED11c036',
};
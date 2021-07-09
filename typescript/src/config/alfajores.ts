const envy = require('envy');
import {ChainConfig, OpticsChainConfig} from "../chain";

/*
* envy Docs: https://www.npmjs.com/package/envy
*
* envy loads variables from .env and
* creates an object with camelCase properties.
*
* if envy doesn't find a .env file, we swallow the error and
* return an empty object
* */
let env: any = {};
try {
    env = envy();
} catch (e) {}

export const alfajores:ChainConfig = {
    name: 'alfajores',
    rpc: "https://alfajores-forno.celo-testnet.org",
    deployerKey: env.alfajoresDeployerKey,
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
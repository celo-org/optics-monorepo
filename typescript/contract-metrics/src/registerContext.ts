import {dev, mainnet, staging} from "@optics-xyz/multi-provider";
import config from "./config";

// register mainnet
mainnet.registerRpcProvider('celo', config.celoRpc);
mainnet.registerRpcProvider('ethereum', config.ethereumRpc);
mainnet.registerRpcProvider('polygon', config.polygonRpc);

// register staging
staging.registerRpcProvider('alfajores', config.alfajoresRpc);
staging.registerRpcProvider('kovan', config.kovanRpc);
staging.registerRpcProvider('rinkeby', config.rinkebyRpc);

// register dev
dev.registerRpcProvider('alfajores', config.alfajoresRpc);
dev.registerRpcProvider('kovan', config.kovanRpc);
dev.registerRpcProvider('rinkeby', config.rinkebyRpc);

export {
    mainnet, staging, dev
};
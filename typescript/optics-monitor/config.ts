import {mainnet} from "@optics-xyz/multi-provider";
import * as dotenv from 'dotenv';
dotenv.config();

const {ETHEREUM_RPC, CELO_RPC, POLYGON_RPC} = process.env;
if (!ETHEREUM_RPC || !CELO_RPC || !POLYGON_RPC) {
    throw new Error('Missing .env with ETHEREUM_RPC, CELO_RPC, POLYGON_RPC');
}

export const mainnets = ["ethereum", "celo", "polygon"];

export function registerMainnets() {
    mainnet.registerRpcProvider("ethereum", ETHEREUM_RPC!);
    mainnet.registerRpcProvider("celo", CELO_RPC!);
    mainnet.registerRpcProvider("polygon", POLYGON_RPC!);
    return mainnet;
}

import { OpticsContext } from "@optics-xyz/multi-provider";

async function getBlockHeight(context:OpticsContext, networkName:string) {
    // wtf why
    let height = context?.getProvider(networkName)?.getBlockNumber() ?? 0
    return height
}

export { getBlockHeight };
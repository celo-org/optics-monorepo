import { OpticsContext } from "@optics-xyz/multi-provider";

async function getBlockHeight(context:OpticsContext, domain:string|number) {
    // wtf why
    let height = context?.getProvider(domain)?.getBlockNumber() ?? 0
    return height
}

export { getBlockHeight };
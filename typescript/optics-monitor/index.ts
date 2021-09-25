import {OpticsContext} from "@optics-xyz/multi-provider";
import {mainnets, registerMainnets} from "./config";
import {BaseContract} from "ethers";
import {TypedEventFilter} from "@optics-xyz/ts-interface/dist/optics-core/commons";
import {Event} from "@ethersproject/contracts/src.ts/index";
import fs from "fs";

monitorAll().then(() => {
    console.log("DONE!");
    process.exit();
});

async function monitorAll() {
    const context = registerMainnets();
    for (let network of mainnets) {
        const origin = network;
        const remotes = mainnets.filter(m => m != origin);
        await monitor(context, origin, remotes);
    }
}

async function getLogs(chainName: string, context: OpticsContext, contract: BaseContract, logFilter: TypedEventFilter<any, any>): Promise<Array<Event>> {
    // TODO: this is a major kludge, will update to be more general within multi-provider
    const POLYGON_FIRST_BLOCK = 18895794;
    const POLYGON = "polygon";
    const BLOCKS_PER_PAGE = 2500;
    if (chainName == POLYGON) {
        const provider = context.getProvider(chainName);
        let currentBlockHeight = await provider!.getBlockNumber();
        let logsPromises = [];
        for (let index = POLYGON_FIRST_BLOCK; index < currentBlockHeight; index += BLOCKS_PER_PAGE) {
            let endBlock = index + BLOCKS_PER_PAGE > currentBlockHeight ? currentBlockHeight : index + BLOCKS_PER_PAGE;
            const logsPromise = contract.queryFilter(logFilter, index, endBlock);
            logsPromises.push(logsPromise);
        }
        const logsArrays = await Promise.all(logsPromises);
        let logs: Array<Event> = [];
        for(let logsArray of logsArrays) {
            logs = logs.concat(logsArray);
        }
        return logs;
    } else {
        return await contract.queryFilter(logFilter);
    }
}

async function getProcessedLogs(context: OpticsContext, remote: string, origin: string) {
    console.log("Get Process logs from ", remote, " for ", origin);
    // get replica
    const originDomain = context.resolveDomain(origin);
    const remoteDomain = context.resolveDomain(remote);
    const replica = context.mustGetCore(remoteDomain).replicas.get(originDomain)!;
    // query process logs
    const processFilter = replica.contract.filters.Process();
    const logs = await getLogs(remote, context, replica.contract, processFilter);
    const logsWithChain = logs.map((log: any) => {
        return {
            chain: remote,
            domain: remoteDomain,
            replica: replica.contract.address,
            ...log
        };
    });
    return logsWithChain;
}

async function getDispatchLogs(context: OpticsContext, origin: string) {
    console.log("Get Dispatch logs from ", origin);
    // get home
    const originDomain = context.resolveDomain(origin);
    const home = context.mustGetCore(origin).home;
    // query dispatch logs
    const dispatchFilter = home.filters.Dispatch();
    const logs = await getLogs(origin, context, home, dispatchFilter);
    const logsWithChain = logs.map((log: any) => {
        return {
            chain: origin,
            domain: originDomain,
            home: home.address,
            ...log
        };
    });
    return logsWithChain;
}

async function writeUnprocessedMessages(processedLogs: any[], dispatchLogs: any[], origin: string) {
    const processedMessageHashes = processedLogs.map((log: any) => log.args.messageHash);
    const unprocessedMessages = dispatchLogs.filter((log: any) => !processedMessageHashes.includes(log.args.messageHash));

    const unprocessedDetails = [];
    for (let log of unprocessedMessages) {
            const transaction = await log.getTransaction();
            const args: any[] = log.args;
            unprocessedDetails.push({
                chain: origin,
                transactionHash: transaction.hash,
                messageHash: args[0],
                leafIndex: args[1].toNumber(),
            });
    }

    console.log(origin, "Summary: ");
    console.log("   Num dispatched: ", dispatchLogs.length);
    console.log("   Num processed: ", processedLogs.length);
    console.log("   Num unprocessed: ", unprocessedMessages.length);
    fs.mkdirSync("unprocessed", { recursive: true });
    fs.writeFileSync(
        `unprocessed/${origin}.json`,
        JSON.stringify(unprocessedDetails, null, 2),
    );
}

async function monitor(context: OpticsContext, origin:string, remotes: string[]) {
    console.log("Check ", origin);
    const dispatchLogs = await getDispatchLogs(context, origin);

    const processedLogs = [];
    for (let remote of remotes) {
        const logsWithChain = await getProcessedLogs(context, remote, origin);
        processedLogs.push(...logsWithChain);
    }

    await writeUnprocessedMessages(processedLogs, dispatchLogs, origin);
}

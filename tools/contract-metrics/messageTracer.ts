import { mainnet, OpticsContext } from "@optics-xyz/multi-provider";
import { core } from '@optics-xyz/ts-interface';
import config from "./config";
import {getLogs} from "./events"

mainnet.registerRpcProvider('celo', config.CeloRpc);
mainnet.registerRpcProvider('ethereum', config.EthereumRpc);
mainnet.registerRpcProvider('polygon', config.PolygonRpc);

const networks = [{name: "ethereum", blockHeight: 13187674}, {name: "celo", blockHeight: 8712249}, {name: "polygon", blockHeight: 18895794}]

const input: TraceInput[] = [
    {
        "chain": "polygon",
        "transactionHash": "0xb1946cde07ad1741f4b6574ea0cf43f3020a1a1764052405ebeb5c0729286f4b",
        "messageHash": "0x5ef2c496b77ec7d0433b5b2a6a5bf760cf26952e447078405ddc9573f63a156c",
        "leafIndex": 428
    }
];

traceMany(input).then(() => {
    console.log("DONE!");
})

async function traceMany(inputs: TraceInput[]) {
    for(let input of inputs) {
        const {chain, transactionHash} = input;
        await traceTransfer(mainnet, chain, transactionHash);
    }
}

interface TraceInput {
    chain: string,
    transactionHash: string,
    messageHash?: string,
    leafIndex?: number,
}

interface TraceDetail {
    chain: string,
    domain: number,
    event: string, 
    blockNumber: number, 
    transactionHash: string,
    metadata: any
}

async function getUpdateDetails(context: OpticsContext, home: core.Home | core.Replica, network: string, domain: number, committedRoot: string): Promise<TraceDetail> {
    const updateLogFilter = home.filters.Update(undefined, committedRoot);
    const homeUpdateLogs = await getLogs(network, context, home, updateLogFilter);
    const updateLog = homeUpdateLogs[0];

    try {
        const updateTx = await updateLog.getTransaction();
        return {
            chain: network,
            domain: domain,
            event: "Update",
            blockNumber: updateTx.blockNumber!,
            transactionHash: updateTx.hash,
            metadata: {
                homeDomain: updateLog!.args!.homeDomain,
                newRoot: committedRoot,
                oldRoot: updateLog!.args!.oldRoot
            }
        };
    } catch {
        console.log("Problem getting Update event...");
        return {
            chain: network,
            domain: domain,
            event: "Update",
            blockNumber: 0,
            transactionHash: "N/A",
            metadata: {
                error: "Transaction Not Found"
            }
        };
    }
}

async function getProcessDetails(context: OpticsContext, replica: core.Replica, network: string, domain: number, messageHash: string): Promise<TraceDetail> {
    const processFilter = replica.filters.Process(messageHash);
    const processLogs = await getLogs(network, context, replica, processFilter);
    const processLog = processLogs[0];

    try {
        const processTx = await processLog.getTransaction();
        return {
            chain: network,
            domain: domain,
            event: "ProcessReplica",
            blockNumber: processTx.blockNumber!,
            transactionHash: processTx.hash,
            metadata: {}
        };
    } catch {
        console.log("Problem getting process event...")
        return {
            chain: network,
            domain: domain,
            event: "ProcessReplica",
            blockNumber: 0,
            transactionHash: "N/A",
            metadata: {
                error: "Transaction Not Found"
            }
        };
    }
}


async function getDispatchDetails(context: OpticsContext, home: core.Home, network: string, domain: number, transactionHash: string): Promise<TraceDetail | undefined> {
    const provider = context.getProvider(network)!;

    let transaction;
    try {
        transaction = await provider.getTransaction(transactionHash);
    } catch (error) {
        console.log(error);
        console.log(`The Send Transaction ID Doesn't exist on ${network}... Are you sure you got it right?`);
        return;
    };

    // TODO: get destination domain from destinationAndSequence
    // on Dispatch event using OpticsMessage class (skip querying for Send event)
    const bridgeRouter = context.mustGetBridge(network).bridgeRouter;
    const sendFilter = bridgeRouter.filters.Send();
    const sendLogs = await getLogs(network, context, bridgeRouter, sendFilter, transaction.blockNumber!);
    const {toDomain} = sendLogs[0]!.args!;
    const destinationDomain = toDomain;

    const dispatchFilter = home.filters.Dispatch();
    const dispatchLogs = await getLogs(network, context, home, dispatchFilter, transaction.blockNumber!);
    const {committedRoot, messageHash, leafIndex} = dispatchLogs[0]!.args!;

    return {
        chain: network,
        domain: domain,
        event: "Send",
        blockNumber: transaction.blockNumber!,
        transactionHash: transaction.hash,
        metadata: {
            destinationDomain,
            committedRoot: committedRoot,
            messageHash: messageHash,
            leafIndex: leafIndex.toNumber()
        }
    };
}

async function traceTransfer(context: OpticsContext, origin:string, transactionHash:string) {
    console.log(`Beginning Trace of ${transactionHash} on ${origin}`);
    const details: TraceDetail[] = [];

    // get Home contract and network
    const originHome = context.mustGetCore(origin).home;
    const originDomain = context.resolveDomain(origin);
    const originNetwork = (await originHome.provider.getNetwork()).name;

    // Hop One - Send Transaction
    const dispatch = await getDispatchDetails(context, originHome, origin, originDomain, transactionHash);
    if(!dispatch) return;
    details.push(dispatch);

    // pull Dispatch details from metadata
    const {destinationDomain, committedRoot, messageHash} = dispatch.metadata;

    // Hop Two - The Update Transaction
    const homeUpdate = await getUpdateDetails(context, originHome, originNetwork, originDomain, committedRoot);
    details.push(homeUpdate);

    // get Replica contract and network
    const replica = context.mustGetCore(destinationDomain).replicas.get(originDomain)!.contract;
    let replicaNetwork = (await replica.provider.getNetwork()).name;

    // Hop Three - The Replica Update Transaction
    const replicaUpdate = await getUpdateDetails(context, replica, replicaNetwork, destinationDomain, committedRoot);
    details.push(replicaUpdate);

    // Hop Four - Process Transaction
    const replicaProcess = await getProcessDetails(context, replica, replicaNetwork, destinationDomain, messageHash);
    details.push(replicaProcess);

    // Log Details
    console.log(details)
}

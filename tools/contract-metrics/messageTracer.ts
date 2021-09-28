import config from "./config";
import {mainnet, OpticsContext, OpticsMessage, OpticsStatus, MessageStatus, OpticsEvent} from "../../typescript/optics-provider/src/optics";

mainnet.registerRpcProvider('celo', config.CeloRpc);
mainnet.registerRpcProvider('ethereum', config.EthereumRpc);
mainnet.registerRpcProvider('polygon', config.PolygonRpc);

const STATUS_TO_STRING = {
    [MessageStatus.Dispatched]: "Dispatched on Home",
    [MessageStatus.Included]: "Included in Home Update",
    [MessageStatus.Relayed]: "Relayed to Replica",
    [MessageStatus.Processed]: "Processed"
};

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

interface TraceOutput {
    status: string,
    events: QuietEvent[]
}

interface QuietEvent {
    event: string,
    nameOrDomain: string | number;
    blockNumber: number;
    transactionHash: string;
}

function transformEvent(opticsEvent: OpticsEvent) {
    // TODO: transform nameOrDomain to human readable
    // TODO: add link to block explorer????
    const {event, nameOrDomain, blockNumber, transactionHash} = opticsEvent;
    return {
        event: event!,
        nameOrDomain,
        blockNumber,
        transactionHash,
    }
}

function transformStatus(opticsStatus: OpticsStatus): TraceOutput {
    const {status, events} = opticsStatus;

    return {
        status: STATUS_TO_STRING[status],
        events: events.map(event => transformEvent(event))
    }
}

async function traceTransfer(context: OpticsContext, origin:string, transactionHash:string) {
    console.log(`Trace ${transactionHash} on ${origin}`);

    const message = await OpticsMessage.singleFromTransactionHash(context, origin, transactionHash);
    const status = await message.events();
    const printableStatus = transformStatus(status);

    // Log Details
    console.log(JSON.stringify(printableStatus, null, 2));
}

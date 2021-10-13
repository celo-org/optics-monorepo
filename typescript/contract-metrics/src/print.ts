import {AnnotatedLifecycleEvent, MessageStatus} from "@optics-xyz/multi-provider/dist/optics";
import {OpticsContext, OpticsStatus} from "@optics-xyz/multi-provider";
import fs from "fs";
import config from "./config";

export function blockExplorerURL(domainName: string, transactionHash: string): string | undefined {
    switch (domainName) {
        case "celo":
            return `https://explorer.celo.org/tx/${transactionHash}`;
        case "ethereum":
            return `https://etherscan.io/tx/${transactionHash}`;
        case "polygon":
            return `https://polygonscan.com/tx/${transactionHash}`;
    }
    return undefined;
}

export const STATUS_TO_STRING = {
    [MessageStatus.Dispatched]: 'Dispatched on Home',
    [MessageStatus.Included]: 'Included in Home Update',
    [MessageStatus.Relayed]: 'Relayed to Replica',
    [MessageStatus.Processed]: 'Processed',
};

interface QuietEvent {
    event: string;
    domainName: string;
    url: string | undefined;
    blockNumber: number;
    transactionHash: string;
}

function quietEvent(
    context: OpticsContext,
    lifecyleEvent: AnnotatedLifecycleEvent,
): QuietEvent {
    const {domain, receipt} = lifecyleEvent;
    const domainName = context.resolveDomainName(domain);
    if (!domainName) {
        throw new Error('I have no name');
    }
    return {
        event: lifecyleEvent.eventName!,
        domainName,
        url: blockExplorerURL(domainName, receipt.transactionHash),
        blockNumber: receipt.blockNumber,
        transactionHash: receipt.transactionHash,
    };
}

export function printStatus(context: OpticsContext, opticsStatus: OpticsStatus) {
    const {status, events} = opticsStatus;
    const printable = {
        status: STATUS_TO_STRING[status],
        events: events.map((event) => quietEvent(context, event)),
    };
    console.log(JSON.stringify(printable, null, 2));
}

export function writeUnprocessedMessages(
    unprocessedDetails: any[],
    origin: string,
) {
    fs.mkdirSync('unprocessed', {recursive: true});
    fs.writeFileSync(
        `unprocessed/${origin}.json`,
        JSON.stringify(unprocessedDetails, null, 2),
    );
}

export function logMonitorMetrics(origin: string, dispatchLogs: any[], processedLogs: any[], unprocessedDetails: any[]) {
    const oldest = unprocessedDetails.length != 0 ? blockExplorerURL(unprocessedDetails[0].chain, unprocessedDetails[0].transactionHash) : "";
    const summary = {
        summary: {
            network: origin,
            dispatched: dispatchLogs.length,
            processed: processedLogs.length,
            unprocessed: unprocessedDetails.length,
            oldest
        }
    }
    config.baseLogger.info(summary, `${origin} Summary`);
}
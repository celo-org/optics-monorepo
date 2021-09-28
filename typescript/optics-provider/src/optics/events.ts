import {BigNumber} from "@ethersproject/bignumber";
import {BaseContract, Event} from "ethers";
import {TypedEventFilter} from "@optics-xyz/ts-interface/dist/optics-core/commons";
import { TransactionReceipt, TransactionResponse } from "@ethersproject/abstract-provider";
import {OpticsContext} from "./OpticsContext";

export type OpticsEvent = DispatchEvent | UpdateEvent | ProcessEvent;

// NOTE: can add any fields
// from TransactionReceipt or TransactionResponse
interface RichEvent {
    // optics
    nameOrDomain: string | number;
    // transaction receipt
    blockNumber: number;
    blockHash: string;
    transactionHash: string;
    transactionIndex: number;
    // transaction response
    timestamp: number;
}

// DISPATCH
export interface DispatchEvent extends RichEvent {
    args: {
        messageHash: string;
        leafIndex: BigNumber;
        destinationAndNonce: BigNumber;
        committedRoot: string;
        message: string;
    };
}

// UPDATE
export interface UpdateEvent extends RichEvent {
    args: {
        homeDomain: BigNumber;
        oldRoot: string;
        newRoot: string;
        signature: string;
    };
}

// PROCESS
export interface ProcessEvent extends RichEvent {
    args: {
        messageHash: string;
        success: boolean;
        returnData: string;
    };
}

export async function eventToRichEvent(context: OpticsContext, nameOrDomain: string | number, event: Event): Promise<RichEvent> {
    const receipt: TransactionReceipt = await event.getTransactionReceipt();
    const transaction: TransactionResponse = await event.getTransaction();
    return {
        nameOrDomain,
        ... event,
        ...receipt,
        timestamp: transaction.timestamp!, // timestamp will exist in TransactionResponse because transaction has definitely mined (because TransactionReceipt already returned)
    };
}

export async function getRichEvents(context: OpticsContext, nameOrDomain: string | number, contract: BaseContract, logFilter: TypedEventFilter<any, any>, startBlock?: number, endBlock?: number): Promise<Array<RichEvent>> {
    const events = await getEvents(context, nameOrDomain, contract, logFilter, startBlock, endBlock);
    const richEventPromises = events.map(event => eventToRichEvent(context, nameOrDomain, event));
    return Promise.all(richEventPromises);
}

export async function getEvents(context: OpticsContext, nameOrDomain: string | number, contract: BaseContract, logFilter: TypedEventFilter<any, any>, startBlock?: number, endBlock?: number): Promise<Array<Event>> {
    if (POLYGON_IDENTIFIERS.includes(nameOrDomain)) {
    return getPolygonEvents(context, nameOrDomain, contract, logFilter, startBlock, endBlock);
    }
    return contract.queryFilter(logFilter, startBlock, endBlock);
}

// TODO: have created a major kludge to deal with Polygon RPC errors.. is there a better way?
const POLYGON_IDENTIFIERS = ["polygon", "matic", 1886350457];
const POLYGON_FIRST_BLOCK = 18895794;
const POLYGON_MAX_BLOCKS = 2500;

export async function getPolygonEvents(context: OpticsContext, nameOrDomain: string | number, contract: BaseContract, logFilter: TypedEventFilter<any, any>, startBlock?: number, endBlock?: number): Promise<Array<Event>> {
    // get the first block by params
    // or polygon deployment block
    const firstBlock = startBlock ? startBlock : POLYGON_FIRST_BLOCK;
    // get the last block by params
    // or current block number
    let lastBlock;
    if (!endBlock) {
    const provider = context.mustGetProvider(nameOrDomain);
    lastBlock = await provider.getBlockNumber();
    } else {
        lastBlock = endBlock;
    }
    // query POLYGON_MAX_BLOCKS at a time, concurrently
    const eventArrayPromises = [];
    for (let currStartBlock = firstBlock; currStartBlock < lastBlock; currStartBlock += POLYGON_MAX_BLOCKS) {
        let attemptedEndBlock = currStartBlock + POLYGON_MAX_BLOCKS;
        let currEndBlock = attemptedEndBlock > lastBlock ? lastBlock : attemptedEndBlock;
        const eventArrayPromise = contract.queryFilter(logFilter, currStartBlock, currEndBlock);
        eventArrayPromises.push(eventArrayPromise);
    }
    // await promises & concatenate results
    const eventArrays = await Promise.all(eventArrayPromises);
    let events: Array<Event> = [];
    for (let eventArray of eventArrays) {
        events = events.concat(eventArray);
    }
    return events;
}
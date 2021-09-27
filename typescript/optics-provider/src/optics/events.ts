import {Log} from "@ethersproject/abstract-provider";
import {OpticsContext} from "./OpticsContext";
import {BaseContract, Event} from "ethers";
import {TypedEventFilter} from "@optics-xyz/ts-interface/dist/optics-core/commons";
import {BigNumber} from "@ethersproject/bignumber";
import {core} from "@optics-xyz/ts-interface";

export type OpticsStatus = {
    status: string;
    events: OpticsEvent[];
}
export type OpticsEvent = DispatchEvent | UpdateEvent | ProcessEvent;

interface RichEvent {
    // optics
    domain?: number;
    // block
    timestamp?: number;
    // transaction receipt
    blockNumber: number;
    blockHash: string;
    transactionHash: string;
    transactionIndex: number;
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

export class MultiEvents {
    protected context: OpticsContext;
    POLYGON_IDENTIFIERS = ["polygon", "matic", 1886350457];
    POLYGON_FIRST_BLOCK = 18895794;
    POLYGON_MAX_BLOCKS = 2500;

    constructor(context: OpticsContext) {
        this.context = context;
    }

    static tryDispatchEvent(log: Log): DispatchEvent | undefined {
        const home = new core.Home__factory().interface;
        try {
            const parsed = home.parseLog(log);
            if (parsed.name === 'Dispatch') {
                return parsed as unknown as DispatchEvent;
            }
        } catch (e) {
        }
        return undefined;
    }

    // TODO: this is a major kludge.. is there a better way?
    async getPolygonEvents(nameOrDomain: string | number, contract: BaseContract, logFilter: TypedEventFilter<any, any>, startBlock?: number, endBlock?: number): Promise<Array<Event>> {
        // get the first block by params
        // or polygon deployment block
        const firstBlock = startBlock ? startBlock : this.POLYGON_FIRST_BLOCK;
        // get the last block by params
        // or current block number
        let lastBlock;
        if (!endBlock) {
            const provider = this.context.mustGetProvider(nameOrDomain);
            lastBlock = await provider.getBlockNumber();
        } else {
            lastBlock = endBlock;
        }
        // query POLYGON_MAX_BLOCKS at a time, concurrently
        const eventArrayPromises = [];
        for (let currStartBlock = firstBlock; currStartBlock < lastBlock; currStartBlock += this.POLYGON_MAX_BLOCKS) {
            let attemptedEndBlock = currStartBlock + this.POLYGON_MAX_BLOCKS;
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

    async getEvents(nameOrDomain: string | number, contract: BaseContract, logFilter: TypedEventFilter<any, any>, startBlock?: number, endBlock?: number): Promise<Array<Event>> {
        if (this.POLYGON_IDENTIFIERS.includes(nameOrDomain)) {
            return this.getPolygonEvents(nameOrDomain, contract, logFilter, startBlock, endBlock);
        }
        return contract.queryFilter(logFilter, startBlock, endBlock);
    }
}
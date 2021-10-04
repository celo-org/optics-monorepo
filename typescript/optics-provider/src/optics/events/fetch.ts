import { Annotated } from '.';
import { OpticsContext } from '..';
import { Domain } from '../../domains';
import { TransactionReceipt } from '@ethersproject/abstract-provider';
import { Result } from '@ethersproject/abi';
import {
  TypedEvent,
  TypedEventFilter,
} from '@optics-xyz/ts-interface/dist/optics-core/commons';

// specifies an interface shared by the TS generated contracts
export interface TSContract<T extends Result, U> {
  queryFilter(
    event: TypedEventFilter<T, U>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined,
  ): Promise<Array<TypedEvent<T & U>>>;
}

export function annotate<U extends Result, T extends TypedEvent<U>>(
  domain: number,
  receipt: TransactionReceipt,
  event: T,
): Annotated<T> {
  return {
    domain,
    receipt,
    name: event.eventSignature?.split('(')[0],
    event,
  };
}

export async function annotateEvent<U extends Result, T extends TypedEvent<U>>(
  domain: number,
  event: T,
): Promise<Annotated<T>> {
  const receipt = await event.getTransactionReceipt();
  return annotate(domain, receipt, event);
}

export async function annotateEvents<U extends Result, T extends TypedEvent<U>>(
  domain: number,
  events: T[],
): Promise<Annotated<T>[]> {
  return Promise.all(events.map(async (event) => annotateEvent(domain, event)));
}

export async function queryAnnotatedEvents<T extends Result, U>(
  context: OpticsContext,
  nameOrDomain: string | number,
  contract: TSContract<T, U>,
  filter: TypedEventFilter<T, U>,
  startBlock?: number,
  endBlock?: number,
): Promise<Array<Annotated<TypedEvent<T & U>>>> {
  const events = await getEvents(
    context,
    nameOrDomain,
    contract,
    filter,
    startBlock,
    endBlock,
  );
  return annotateEvents(context.resolveDomain(nameOrDomain), events);
}

export async function getEvents<T extends Result, U>(
  context: OpticsContext,
  nameOrDomain: string | number,
  contract: TSContract<T, U>,
  filter: TypedEventFilter<T, U>,
  startBlock?: number,
  endBlock?: number,
): Promise<Array<TypedEvent<T & U>>> {
  const domain = context.mustGetDomain(nameOrDomain);
  if (domain.paginate) {
    return getPaginatedEvents(
      context,
      domain,
      contract,
      filter,
      startBlock,
      endBlock,
    );
  }
  return contract.queryFilter(filter, startBlock, endBlock);
}

export async function getPaginatedEvents<T extends Result, U>(
  context: OpticsContext,
  domain: Domain,
  contract: TSContract<T, U>,
  filter: TypedEventFilter<T, U>,
  startBlock?: number,
  endBlock?: number,
): Promise<Array<TypedEvent<T & U>>> {
  // get the first block by params
  // or domain deployment block
  const firstBlock = startBlock
    ? Math.max(startBlock, domain.paginate!.from)
    : domain.paginate!.from;
  // get the last block by params
  // or current block number
  let lastBlock;
  if (!endBlock) {
    const provider = context.mustGetProvider(domain.id);
    lastBlock = await provider.getBlockNumber();
  } else {
    lastBlock = endBlock;
  }
  // query domain pagination limit at a time, concurrently
  const eventArrayPromises = [];
  for (
    let from = firstBlock;
    from <= lastBlock;
    from += domain.paginate!.blocks
  ) {
    const nextFrom = from + domain.paginate!.blocks;
    const to = Math.min(nextFrom, lastBlock);
    const eventArrayPromise = contract.queryFilter(filter, from, to);
    eventArrayPromises.push(eventArrayPromise);
  }
  // await promises & concatenate results
  const eventArrays = await Promise.all(eventArrayPromises);
  let events: Array<TypedEvent<T & U>> = [];
  for (let eventArray of eventArrays) {
    events = events.concat(eventArray);
  }
  return events;
}

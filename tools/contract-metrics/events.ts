import { OpticsContext } from '@optics-xyz/multi-provider';
import { xapps } from '@optics-xyz/ts-interface';
import { BigNumber } from 'ethers';

import {
  AnnotatedSend,
  AnnotatedTokenDeployed,
  SendArgs,
  SendTypes,
  TokenDeployedArgs,
  TokenDeployedTypes,
} from '@optics-xyz/multi-provider/dist/optics/events/bridgeEvents';
import { queryAnnotatedEvents } from '@optics-xyz/multi-provider/dist/optics/events';
import {
  TypedEvent,
  TypedEventFilter,
} from '@optics-xyz/ts-interface/dist/optics-core/commons';
import { Result } from 'ethers/lib/utils';

export interface SendDetail {
  name?: string;
  symbol?: string;
  decimals?: number;
  address: string;
  total: BigNumber;
}

export interface SendDetails {
  [key: string]: SendDetail;
}

export interface TokenDeployDetail {
  name?: string;
  symbol?: string;
  decimals?: number;
  address: string;
  id: string;
  domain: number;
}

export interface TokenDeployDetails {
  [key: string]: TokenDeployDetail;
}

interface TSContract<T extends Result, U> {
  queryFilter(
    event: TypedEventFilter<T, U>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined,
  ): Promise<Array<TypedEvent<T & U>>>;
}

export async function getSendEvents(
  context: OpticsContext,
  networkName: string,
  fromBlock: number,
  toBlock?: number,
): Promise<Array<AnnotatedSend>> {
  let router = context.mustGetBridge(networkName).bridgeRouter;
  let filter: TypedEventFilter<SendTypes, SendArgs> = router.filters.Send();
  if (toBlock) {
    return await queryAnnotatedEvents<SendTypes, SendArgs>(
      context,
      networkName,
      router as TSContract<SendTypes, SendArgs>,
      filter,
      fromBlock,
      toBlock,
    );
  } else {
    return await queryAnnotatedEvents<SendTypes, SendArgs>(
      context,
      networkName,
      router as TSContract<SendTypes, SendArgs>,
      filter,
      fromBlock,
    );
  }
}

export async function processSendEvents(
  context: OpticsContext,
  networkName: string,
  events: AnnotatedSend[],
) {
  let token = new xapps.BridgeToken__factory();
  let details: SendDetails = {};

  // events.forEach(async (event) => {

  // })
  for (let index = 0; index < events.length; index++) {
    const event = events[index];
    const address = event.event.args.token;
    try {
      if (address in details) {
        //console.log(`adding ${event.args["amount"]} to ${address}`)
        details[address].total = details[address].total.add(
          event.event.args.amount,
        );
      } else {
        let contract = token
          .attach(address)
          .connect(context.getProvider(networkName) ?? '');
        let name = await contract.name();
        let symbol = await contract.symbol();
        let decimals = await contract.decimals();
        details[address] = {
          name: name,
          symbol: symbol,
          address: address,
          decimals: decimals,
          total: event.event.args.amount,
        };
      }
    } catch (error) {
      console.log(error);
      if (address in details) {
        details[address].total.add(event.event.args.amount);
      } else {
        details[address] = {
          address: address,
          total: event.event.args.amount,
        };
      }
    }
  }
  return details;
}

export async function getTokenDeployedEvents(
  context: OpticsContext,
  networkName: string,
  fromBlock: number,
  toBlock?: number,
): Promise<Array<AnnotatedTokenDeployed>> {
  let router = context.mustGetBridge(networkName).bridgeRouter;
  let filter = router.filters.TokenDeployed();
  if (toBlock) {
    return await queryAnnotatedEvents<TokenDeployedTypes, TokenDeployedArgs>(
      context,
      networkName,
      router as TSContract<TokenDeployedTypes, TokenDeployedArgs>,
      filter,
      fromBlock,
      toBlock,
    );
  } else {
    return await queryAnnotatedEvents<TokenDeployedTypes, TokenDeployedArgs>(
      context,
      networkName,
      router as TSContract<TokenDeployedTypes, TokenDeployedArgs>,
      filter,
      fromBlock,
    );
  }
}

export async function processTokenDeployedEvents(
  context: OpticsContext,
  networkName: string,
  events: AnnotatedTokenDeployed[],
) {
  let token = new xapps.BridgeToken__factory();
  let details: TokenDeployDetails = {};

  for (let index = 0; index < events.length; index++) {
    const event = events[index];
    const address = event.event.args.representation;
    const tokenId = event.event.args.id;
    const domain = event.event.args.domain;

    try {
      let contract = token
        .attach(address)
        .connect(context.getProvider(networkName) ?? '');
      let name = await contract.name();
      let symbol = await contract.symbol();
      let decimals = await contract.decimals();
      details[address] = {
        name: name,
        symbol: symbol,
        address: address,
        decimals: decimals,
        id: tokenId,
        domain: domain,
      };
    } catch (error) {
      console.log(error);
      console.log(event);
      details[address] = {
        address: address,
        id: tokenId,
        domain: domain,
      };
    }
  }
  return details;
}

import {OpticsContext, OpticsMessage} from '@optics-xyz/multi-provider';
import { TransferMessage } from '@optics-xyz/multi-provider/dist/optics/messages/BridgeMessage'
import {getEvents} from "@optics-xyz/multi-provider/dist/optics/events/fetch";
import * as contexts from "./registerContext";
import config from './config';
import { BigNumber, ethers } from 'ethers';
import { TokenIdentifier } from '@optics-xyz/multi-provider/dist/optics';

main().then(() => {
    console.log("DONE!")
})

async function main() {
  // Inspect Celo / Ethereum
  await inspect(contexts.mainnet, 'celo', ['ethereum'])
}

// Count the number of messages that flow to each of the replicas from origin
// Compute stats about this like: 
//      Ratio of Messages in/Out 
async function inspect(
  context: OpticsContext,
  origin: string,
  remotes: string[],
) { 
  // Get outbound dispatches from origin
  config.baseLogger.info(`Inspecting ${origin}`);
  config.baseLogger.info(`Get Dispatch logs from ${origin}`);
  const originDomain = context.resolveDomain(origin)
  const home = context.mustGetCore(origin).home;
  const dispatchFilter = home.filters.Dispatch();
  const dispatchLogs = await getEvents(
    context,
    origin,
    home,
    dispatchFilter,
  );
  
  let originDispatchReceipts = await Promise.all(dispatchLogs.map((dispatch) => {
    return dispatch.getTransactionReceipt()
  }))

  config.baseLogger.info(`Process ${origin} Events -> Messages`);
  let originDispatchMessages = []
  for (let receipt of originDispatchReceipts){
    let tempMessages = OpticsMessage.fromReceipt(context, origin, receipt)
    for (let message of tempMessages ) {
      const bridgemessage = TransferMessage.fromOpticsMessage(context, message)
      if (bridgemessage instanceof TransferMessage){
        originDispatchMessages.push(bridgemessage)
      }
    }
  }
  // Get Inbound Dispatches 
  for (let remote of remotes) {
    config.baseLogger.info(`Get ${remote} Dispatch Events`);
    const home = context.mustGetCore(remote).home;
    const replicaDomain = context.resolveDomain(remote)
    const dispatchFilter = home.filters.Dispatch();
    const dispatchLogs = await getEvents(
      context,
      remote,
      home,
      dispatchFilter,
    );
    let remoteDispatchReceipts = await Promise.all(dispatchLogs.map((dispatch) => {
      return dispatch.getTransactionReceipt()
    }))
    config.baseLogger.info(`Process ${remote} Events -> Messages`);
    let replicaDispatchMessages = []
    for (let receipt of remoteDispatchReceipts){
      let tempMessages = OpticsMessage.fromReceipt(context, origin, receipt)
      for (let message of tempMessages ) {
        const bridgemessage = TransferMessage.fromOpticsMessage(context, message)
        if (bridgemessage instanceof TransferMessage){
          replicaDispatchMessages.push(bridgemessage)
        }
      }
    }

    config.baseLogger.info(`Filter Inbound messages from ${remote} -> ${origin}`);
    // filter for messages that were sent from replica to origin
    let inboundMessages = replicaDispatchMessages.filter((message) => {
      return message.message.destination == originDomain
    })

    // filter for messages that were sent from origin to replica
    let outboundMessages = originDispatchMessages.filter((message) => {
      return message.message.destination == replicaDomain
    })
    config.baseLogger.info(`Inbound Messages ${origin} <- ${remote}: ${inboundMessages.length}`)
    config.baseLogger.info(`Outbound Messages ${origin} -> ${remote}: ${outboundMessages.length}`)

    const tokenReducer = (map: ReduceSummary, message: TransferMessage) => {
      const key = `${message.token.id}-${message.token.domain}`
      const value = message.amount
      if (map[key] === undefined) {
        map[key] = {
          amount: value,
          average: value,
          median: value,
          token: message.token,
          messages: [message],
          transfers: 1
        };
      } else {
        map[key].amount = map[key].amount.add(value)
        map[key].messages.push(message)
        ++map[key].transfers
        map[key].median = median(map[key].messages)
        map[key].average = map[key].messages.reduce((previous: BigNumber, message: TransferMessage, _, { length }) => {
          return previous.add(message.amount).div(length)
        }, BigNumber.from(0))
        
      }
      return map;
    };
    // Calculate Inbound Value
    const inboundValue = inboundMessages.reduce(tokenReducer, {})
    const outboundValue = outboundMessages.reduce(tokenReducer, {})

    config.baseLogger.info(`Tokens transferred from ${remote} -> ${origin}`)
    config.baseLogger.info(`Tokens transferred from ${origin} -> ${remote}`)

    const reconciled = await reconcileTransfers(context, inboundValue, outboundValue)

    await printTokens(context, remote, reconciled)
    
    //await printTokens(context, origin, outboundValue)
  }
}

function median(messages: TransferMessage[]){
  messages.sort((a, b) => {
    const res = a.amount.sub(b.amount)
    if(res.isNegative())
      return -1
    if(res.isZero())
      return 0
    return 1
  })
  var half = Math.floor(messages.length / 2)

  if (messages.length % 2)
    return messages[half].amount
  
  return messages[half - 1].amount.add(messages[half].amount).div(2)
}

async function reconcileTransfers(context: OpticsContext, inbound: TransferSummary, outbound: TransferSummary) {
  const output: TransferSummary = inbound
  for (let key of Object.keys(outbound)) {
    if (key in output) {
      output[key].amount = output[key].amount.sub(outbound[key].amount)
      //output[key].average = output[key].average.add(outbound[key].average).div(2)
    } else {
      output[key] = outbound[key]
      output[key].amount = output[key].amount.mul(-1)
      
    }
  }
  return output
}

type TransferSummary = {[key: string]: TransferEntry} 
type TransferEntry = {amount: BigNumber, average: BigNumber, median: BigNumber, token: TokenIdentifier, transfers: number}
type ReduceSummary = {[key: string]: ReduceEntry} 
type ReduceEntry = {amount: BigNumber, average: BigNumber, median: BigNumber, token: TokenIdentifier, transfers: number, messages: TransferMessage[]}

async function printTokens(context: OpticsContext, domain: string | number, map: TransferSummary){
  const summary = []
  for(let key of Object.keys(map)){
    const entry = map[key]
    const token = await context.resolveRepresentation(domain, entry.token)
    const symbol = await token?.symbol()
    const amount = await ethers.utils.formatUnits(entry.amount, await token!.decimals())
    const average = await ethers.utils.formatUnits(entry.average, await token!.decimals())
    const median = await ethers.utils.formatUnits(entry.median, await token!.decimals())
    const res = {
      token: symbol,
      domain: entry.token.domain,
      amount: amount,
      average: average,
      median: median,
      transfers: entry.transfers
    }
    summary.push(res)
  }
  config.baseLogger.info({summary: summary})
}
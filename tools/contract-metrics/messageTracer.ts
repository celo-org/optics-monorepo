import { mainnet, OpticsContext } from "@optics-xyz/multi-provider";
import config from "./config";
import {getLogs} from "./events"
import {ethers} from "ethers"

mainnet.registerRpcProvider('celo', config.CeloRpc);
mainnet.registerRpcProvider('ethereum', config.EthereumRpc);
mainnet.registerRpcProvider('polygon', config.PolygonRpc);

const networks = [{name: "ethereum", blockHeight: 13187674}, {name: "celo", blockHeight: 8712249}, {name: "polygon", blockHeight: 18895794}]


interface TraceDetail { 
    event: string, 
    blockNumber: number, 
    transactionHash: string,
    metadata: {}
}

interface TraceDetails {
    [index: number]: TraceDetail
}

async function traceTransfer(context: OpticsContext, origin:string, transactionHash:string) {

    console.log(`Beginning Trace of ${transactionHash} on ${origin}`)

    let details: TraceDetail[] = []
    const originDomain = context.resolveDomain(origin)
    const provider = context.getProvider(origin)!
    let router = context.mustGetBridge(origin).bridgeRouter;
    let originHome = context.mustGetCore(origin).home

    // Hop One - The send transaction
    let transaction;
    try {
        transaction = await provider.getTransaction(transactionHash)
    } catch (error) {
        console.log(error)
        console.log(`The Send Transaction ID Doesn't exist on ${origin}... Are you sure you got it right?`)
        return
    }
    
    let sender = transaction.from
    let txData = transaction.data

    let decoded = router.interface.decodeFunctionData("send", txData)
    const tokenAddress = decoded["_token"]
    const destinationDomain = decoded["_destination"]
    const recipient = decoded["_recipient"]

    const txReceipt = await provider.getTransactionReceipt(transactionHash)
    const logs = txReceipt.logs

    const sendLog = logs.find(element => element.address === router.address)
    const approveLog = logs.find(element => element.address === tokenAddress)
    const dispatchLog = logs.find(element => element.address === originHome.address)!


    const decodedDispatch = originHome.interface.parseLog(dispatchLog)
    const committedRoot = decodedDispatch.args["committedRoot"]
    const messageHash = decodedDispatch.args["messageHash"]
    const leafIndex = decodedDispatch.args["leafIndex"]

    details.push({
        event: "Send",
        blockNumber: transaction.blockNumber!,
        transactionHash: transaction.hash,
        metadata: {
            committedRoot: committedRoot,
            messageHash: messageHash,
            leafIndex: leafIndex.toNumber()
        }
    })

    
    // Hop Two - The Update Transaction 

    const updateLogFilter = originHome.filters.Update(undefined, committedRoot)
    let network = (await originHome.provider.getNetwork()).name
    const homeUpdateLogs = await getLogs(network, context, originHome, updateLogFilter)
    const updateLog = homeUpdateLogs[0]
    console.log('it worked yo')
    try {
        const updateTx = await updateLog.getTransaction()
        
        details.push({
            event: "UpdateHome",
            blockNumber: updateTx.blockNumber!,
            transactionHash: updateTx.hash,
            metadata: {
                homeDomain: updateLog!.args!.homeDomain,
                newRoot: committedRoot,
                oldRoot: updateLog!.args!.oldRoot
            }
        })
    } catch {
        console.log("Problem getting UpdateHome event...")
        details.push({
            event: "UpdateHome",
            blockNumber: 0,
            transactionHash: "N/A",
            metadata: {
                error: "Transaction Not Found"
            }
        })
    }

    // Hop Three - The Replica Update Transaction 
    const replica = context.mustGetCore(destinationDomain).replicas.get(originDomain)!
    const replicaLogFilter = replica.contract.filters.Update(undefined, committedRoot)
    let replicaNetwork = (await replica.contract.provider.getNetwork()).name
    const replicaUpdateLogs = await getLogs(replicaNetwork, context, replica.contract, replicaLogFilter)
    const replicaUpdateLog = replicaUpdateLogs[0]

    try{
        const replicaUpdateTx = await replicaUpdateLog.getTransaction()
        details.push({
            event: "UpdateReplica",
            blockNumber: replicaUpdateTx.blockNumber!,
            transactionHash: replicaUpdateTx.hash,
            metadata: {
                homeDomain: replicaUpdateLog!.args!.homeDomain,
                newRoot: replicaUpdateLog!.args!.newRoot,
                oldRoot: replicaUpdateLog!.args!.oldRoot
            }
        })
    }
    catch {
        console.log("Problem getting UpdateReplica event...")
        details.push({
            event: "UpdateReplica",
            blockNumber: 0,
            transactionHash: "N/A",
            metadata: {
                error: "Transaction Not Found"
            }
        })
    }
    // Hop Four - The Token Mint Transaction 
    const processFilter = replica.contract.filters.Process(messageHash)
    network = (await replica.contract.provider.getNetwork()).name
    const processLogs = await getLogs(network, context, replica.contract, processFilter)
    const processLog = processLogs[0]

    try {
        const processTx = await processLog.getTransaction()
        const processTxReceipt = await provider.getTransactionReceipt(processTx.hash)
        details.push({
            event: "ProcessReplica",
            blockNumber: processTx.blockNumber!,
            transactionHash: processTx.hash,
            metadata: {
                recipient: recipient
            }
        })
    }
    catch {
        console.log("Problem getting process event...")
        details.push({
            event: "ProcessReplica",
            blockNumber: 0,
            transactionHash: "N/A",
            metadata: {
                error: "Transaction Not Found"
            }
        })
    }
    

    
    console.log(details)
}

(async function main() {
    await traceTransfer(mainnet, "celo", "0xbadcaf0ac0947eff56a9c26852d573056abbc5ef7fdb7a51089b7c963b019de5")
})()

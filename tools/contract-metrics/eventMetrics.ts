import { mainnet } from "@optics-xyz/multi-provider";
import { xapps } from '@optics-xyz/ts-interface'
import config from "./config";
import { ethers } from "ethers";

interface LooseObject {
    [key: string]: any
}


mainnet.registerRpcProvider('celo', config.CeloRpc);
mainnet.registerRpcProvider('ethereum', config.EthereumRpc);
mainnet.registerRpcProvider('polygon', config.PolygonRpc);


async function eventSendMetrics() {
    let networks = [{name: "ethereum", blockHeight: 13187674}, {name: "celo", blockHeight: 8712249}]//, {name: "polygon", blockHeight: 18895794}]
    let output: LooseObject = {}

    networks.forEach(async (network) => {
        console.log(`Processing sends on ${network.name}`)
        let router = mainnet.mustGetBridge(network.name).bridgeRouter;
        let token = new xapps.BridgeToken__factory()
        
        let filter = router.filters.TokenDeployed();
        let events = await router.queryFilter(filter, network.blockHeight);
        let details: LooseObject = {}
    
        for (let index = 0; index < events.length; index++) {
            const event = events[index];
            const address = event.args["token"]
            let contract = token.attach(address).connect(mainnet.getProvider(network.name) ?? "")
            try {
                let name = await contract.name()
                let symbol = await contract.symbol()
                let decimals = await contract.decimals()
                if (address in details){
                    //console.log(`adding ${event.args["amount"]} to ${address}`)
                    details[address].total = details[address].total.add(event.args["amount"])
                }
                else {
                    details[address] = {
                        name: name,
                        symbol: symbol,
                        address: address,
                        decimals: decimals,
                        total: event.args["amount"]
                    }
                }
                
            } catch (error) {
                console.log(error)
                if (address in details){
                    details[address].total.add(event.args["amount"])
                }
                else {
                    details[address] = {
                        address: address,
                        total: event.args["amount"]
                    }
                }
            }
        } 
        console.log(`Tokens Sent from ${network.name}:`)
        for (var key in details ){
            console.log(`Token Name: \t${details[key].name}`)
            console.log(`Token Symbol: \t${details[key].symbol}`)
            console.log(`Token Address: \t${details[key].address}`)
            console.log(`Decimals: \t${details[key].decimals}`)
            if (details[key].decimals == 18){
                console.log(`Total Sent: \t${ethers.utils.formatEther(details[key].total)}`)
            }
            else{
                if(details[key].decimals){
                    console.log(`Total Sent: \t${details[key].total * 10**-(details[key].decimals)}`)
                }
                else {
                    console.log(`Total Sent: \t${details[key].total}`)
                }
                
            }
            console.log()
        } 
    })
    
};

(async function main() {
    await eventSendMetrics()
})()

import { mainnet } from "@optics-xyz/multi-provider";
import { xapps } from '@optics-xyz/ts-interface'
import config from "./config";
import { ethers } from "ethers";
import { getSendEvents, processSendEvents } from "./events";
import { getBlockHeight } from "./utils";
import { TypedEvent } from "@optics-xyz/ts-interface/dist/optics-xapps/commons";

interface LooseObject {
    [key: string]: any
}


mainnet.registerRpcProvider('celo', config.CeloRpc);
mainnet.registerRpcProvider('ethereum', config.EthereumRpc);
mainnet.registerRpcProvider('polygon', config.PolygonRpc);


async function eventSendMetrics() {
    let networks = [{name: "ethereum", blockHeight: 13187674}, {name: "celo", blockHeight: 8712249}, {name: "polygon", blockHeight: 18895794}]

    networks.forEach(async (network) => {
        //console.log(`Processing sends on ${network.name}`)
        
        // get Send events
        let events: TypedEvent<[string, string, number, string, ethers.BigNumber] & {
            token: string;
            from: string;
            toDomain: number;
            toId: string;
            amount: ethers.BigNumber;
        }>[] = []

        if (network.name == "polygon") {
            let currentBlockHeight = await getBlockHeight(mainnet, network.name)
            console.log(`Processing ${(currentBlockHeight - network.blockHeight) / 10000} pages for Polygon`)
            for (let index = network.blockHeight; index < currentBlockHeight; index+=10000) {
                let checkpoint = await getSendEvents(mainnet, network.name, index, index+10000)
                //console.log(index, index+10000)
                events = events.concat(checkpoint)
            }
        }
        else {
            events = await getSendEvents(mainnet, network.name, network.blockHeight)
        }

        console.log(`Got ${events.length} Events from ${network.name}`)
        
        let details = await processSendEvents(mainnet, network.name, events);
        
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
                    console.log(`Total Sent: \t${details[key].total.toNumber() * (10**-(details[key].decimals!))}`)
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

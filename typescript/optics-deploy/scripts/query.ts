import fs from "fs";
import * as alfajores from '../config/alfajores';
import * as kovan from '../config/kovan';
import {Contract} from 'ethers';
import * as contracts from '../../typechain/optics-core';
import {
    getPathToLatestBridgeDeploy,
    getPathToLatestDeploy,
    parseFileFromDeploy
} from "../src/verification/readDeployOutput";
import {CoreContractDeployOutput} from "../src/chain";
import {EventFilter} from "@ethersproject/contracts/src.ts/index";

const homeChain = kovan.chain;
const remoteChain = alfajores.chain;
const homeAddresses = getDeployedAddresses(homeChain.config.name);
const remoteAddresses = getDeployedAddresses(remoteChain.config.name);

const replicaAddress = homeAddresses.replicas![remoteChain.config.domain].proxy;
const replica: contracts.Replica = contracts.Replica__factory.connect(replicaAddress, homeChain.provider);

const homeAddress = remoteAddresses.home.proxy;
const alfaHome: contracts.Home = contracts.Home__factory.connect(homeAddress, remoteChain.provider);

getProcessEvents(replica, alfaHome).then(() => {
    console.log("Done!");
    process.exit();
});

function getDeployedAddresses(name: string) {
    const corePath = getPathToLatestDeploy();
    const bridgePath = getPathToLatestBridgeDeploy();

    const coreAddresses: CoreContractDeployOutput = parseFileFromDeploy(
        corePath,
        name,
        'contracts',
    );

    const bridgeAddresses: CoreContractDeployOutput = parseFileFromDeploy(
        bridgePath,
        name,
        'contracts',
    );

    return {
        ...bridgeAddresses,
        ...coreAddresses
    };
}

async function getParsedEvents(contract: Contract, filter: EventFilter) {
    const logs = await contract.queryFilter(filter);
    const parsedLogs = logs.map((log) => contract.interface.parseLog(log));
    return parsedLogs;
}

async function getProcessEvents(replica: contracts.Replica, home: contracts.Home) {
    const dispatches = await getParsedEvents(home, home.filters.Dispatch());
    console.log("Num dispatch on Alfa: ", dispatches.length);

    const dispatchedLeaves = dispatches.map(event => event["args"][2]);

    const processSuccesses = await getParsedEvents(replica, replica.filters.ProcessSuccess());
    console.log("Num process successes on Kovan: ", processSuccesses.length);

    const processedLeaves = processSuccesses.map(event => event["args"][0]);

    const dispatchedNotProcessedLeaves = dispatchedLeaves.filter(leaf => !processedLeaves.includes(leaf));

    console.log("Num dispatched not processed leaves: ", dispatchedNotProcessedLeaves.length);

    fs.writeFileSync(
        `dispatchedLeaves.json`,
        JSON.stringify(dispatchedLeaves, null, 2),
    );
    fs.writeFileSync(
        `processedLeaves.json`,
        JSON.stringify(processedLeaves, null, 2),
    );
    fs.writeFileSync(
        `dispatchedNotProcessedLeaves.json`,
        JSON.stringify(dispatchedNotProcessedLeaves, null, 2),
    );
}


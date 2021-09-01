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
import {Chain, CoreContractDeployOutput} from "../src/chain";
import {EventFilter} from "@ethersproject/contracts/src.ts/index";

checkEvents(kovan.chain, alfajores.chain).then(() => {
    console.log("");
    checkEvents(alfajores.chain, kovan.chain).then(() => {
        console.log("Done!");
        process.exit();
    });
});

async function checkEvents(homeChain: Chain, replicaChain: Chain) {
    const home = getHome(homeChain);
    const homeName = homeChain.config.name;
    const dispatches = await getLogs(home, home.filters.Dispatch());
    console.log(`Num dispatch on ${homeName} Home:`, dispatches.length);

    const replica = getReplicaForHome(homeChain, replicaChain);
    const replicaName = replicaChain.config.name;
    const processSuccesses = await getLogs(replica, replica.filters.ProcessSuccess());
    console.log(`Num process success on ${replicaName} Replica:`, processSuccesses.length);
    const processErrors = await getLogs(replica, replica.filters.ProcessError());
    console.log(`Num process error on ${replicaName} Replica:`, processErrors.length);

    const dispatchedLeaves = dispatches.map(event => event["args"][2]);
    const processSuccessLeaves = processSuccesses.map(event => event["args"][0]);
    const processFailLeaves = processErrors.map(event => event["args"][0]);
    const processedLeaves = processSuccessLeaves.concat(processFailLeaves);
    const unprocessedDispatches = dispatches.filter(dispatch => !processedLeaves.includes(dispatch["args"][2]));
    console.log(`Backlog ${homeName} => ${replicaName}: `, unprocessedDispatches.length);

    writeQueryResults(homeName, replicaName, dispatchedLeaves, processSuccessLeaves, processErrors, unprocessedDispatches);
}

function writeQueryResults(homeName: string, replicaName: string, dispatchedLeaves: any[], processSuccessLeaves: any[], processErrors: any[], unprocessedDispatches: any[]) {
    const dir = `query/${Date.now()}-${homeName}-to-${replicaName}`;
    fs.mkdirSync(dir, {recursive: true});
    fs.writeFileSync(
        `${dir}/dispatchedLeaves-${homeName}.json`,
        JSON.stringify(dispatchedLeaves, null, 2),
    );
    fs.writeFileSync(
        `${dir}/processSuccessLeaves-${replicaName}.json`,
        JSON.stringify(processSuccessLeaves, null, 2),
    );
    fs.writeFileSync(
        `${dir}/processErrors-${replicaName}.json`,
        JSON.stringify(processErrors, null, 2),
    );
    fs.writeFileSync(
        `${dir}/unprocessedDispatches-${homeName}.json`,
        JSON.stringify(unprocessedDispatches, null, 2),
    );
}

function getReplicaForHome(homeChain: Chain, replicaChain: Chain): contracts.Replica {
    const deployedAddresses = getDeployedAddresses(replicaChain.config.name);
    const replicaAddress = deployedAddresses.replicas![homeChain.config.domain].proxy;
    const replica: contracts.Replica = contracts.Replica__factory.connect(replicaAddress, replicaChain.provider);
    return replica;
}

function getHome(homeChain: Chain): contracts.Home {
    const deployedAddresses = getDeployedAddresses(homeChain.config.name);
    const homeAddress = deployedAddresses.home.proxy;
    const home: contracts.Home = contracts.Home__factory.connect(homeAddress, homeChain.provider);
    return home;
}

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

async function getLogs(contract: Contract, filter: EventFilter) {
    const logs = await contract.queryFilter(filter);
    const fullLogs = logs.map((log) => {
        const parsedLog = contract.interface.parseLog(log);
        return {
            ...log,
            ...parsedLog,
        };
    });
    return fullLogs;
}

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
const deployedAddresses = getDeployedAddresses(homeChain.config.name);
const replicaAddress = deployedAddresses.replicas![remoteChain.config.domain].proxy;
const replica: contracts.Replica = contracts.Replica__factory.connect(replicaAddress, homeChain.provider);

getProcessEvents(replica).then(() => {
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

async function getProcessEvents(replica: contracts.Replica) {
    const processErrors = await getParsedEvents(replica, replica.filters.ProcessError());
    const processSuccesses = await getParsedEvents(replica, replica.filters.ProcessSuccess());
    console.log(JSON.stringify(processErrors, null, 2));
    console.log("Num process successes: ", processSuccesses.length);
}


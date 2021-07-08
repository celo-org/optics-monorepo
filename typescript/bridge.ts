import {Chain, ContractDeployOutput, ContractVerificationInput, ChainConfig, toChain, Deploy} from './chain';
import {parseFileFromDeploy} from "../solidity/optics-core/ts/readDeployConfig";
import * as xAppContracts from "./typechain/optics-xapps";
import * as contracts from "./typechain/optics-core";
import {toBytes32} from "./optics-tests/lib/utils";

export type BridgeContracts = {
  bridgeRouter?: xAppContracts.BridgeRouter
};

export type BridgeDeploy = {
  coreDeployPath: string;
  coreContractAddresses: ContractDeployOutput,
  chain: Chain;
  contracts: BridgeContracts;
  verificationInput: ContractVerificationInput[],
};

export type BridgeDeployOutput = {
  bridgeRouter?: string;
};

/**
 * Construct a BridgeDeploy
 * form the Optics core contracts given by coreDeployPath
 * and the config provided
 *
 * @param coreDeployPath - relative path to the directory with Optics core contract deploy configs
 * @param config - ChainConfig to configure connection & deployer signer for a given chain
 */
export function getBridgeDeploy(coreDeployPath: string, config: ChainConfig): BridgeDeploy {
  const coreContractAddresses: ContractDeployOutput = parseFileFromDeploy(
      coreDeployPath,
      config.name,
      'contracts',
  );

  return {
    chain: toChain(config),
    contracts: {},
    verificationInput: [],
    coreDeployPath,
    coreContractAddresses,
  };
}

/**
 * Deploy and configure a cross-chain token bridge system
 * with one BridgeRouter on each of the provided chains
 * with ownership delegated to Optics governance
 *
 * @param deploys - The list of deploy instances for each chain
 */
export async function deployBridges(deploys: BridgeDeploy[]) {
  // deploy BridgeRouters
  for(let deploy of deploys) {
    await deployBridgeRouter(deploy);
  }

  // enroll peer BridgeRouters with each other
  const enrollPromises: Promise<void>[] = [];
  for(let deploy of deploys) {
    enrollPromises.push(enrollAllBridgeRouters(deploy, deploys));
  }
  await Promise.all(enrollPromises);

  // after finishing enrolling,
  // transfer ownership of BridgeRouters to Governance
  const transferPromises: Promise<void>[] = [];
  for (let deploy of deploys) {
    transferPromises.push(transferOwnershipToGovernance(deploy));
  }
  await Promise.all(enrollPromises);

  // TODO: output the Bridge deploy information to a bridge subdirectory of the cor system deploy config folder
}

/**
 * Deploys the BridgeRouter on the chain of the given deploy and updates
 * the deploy instance with the new contract.
 *
 * @param deploy - The deploy instance
 */
async function deployBridgeRouter(deploy: BridgeDeploy) {
  let factory = new xAppContracts.BridgeRouter__factory(
      deploy.chain.deployer,
  );

  const bridgeRouter = await factory.deploy(deploy.coreContractAddresses.xappConnectionManager, {
    gasPrice: deploy.chain.gasPrice,
  });

  await bridgeRouter.deployTransaction.wait(5);

  deploy.contracts.bridgeRouter = bridgeRouter;

  // add contract information to Etherscan verification array
  deploy.verificationInput.push({
    name: "BridgeRouter",
    address: bridgeRouter!.address,
    constructorArguments: [deploy.coreContractAddresses.xappConnectionManager]
  });
}

/**
 * Enroll all other chains' BridgeRouters as remote routers
 * to a single chain's BridgeRouter
 *
 * @param deploy - The deploy instance for the chain on which to enroll routers
 * @param allDeploys - Array of all deploy instances for the Bridge deploy
 */
export async function enrollAllBridgeRouters(deploy:BridgeDeploy, allDeploys: BridgeDeploy[]) {
  for(let remoteDeploy of allDeploys) {
    if(deploy.chain.name != remoteDeploy.chain.name) {
      await enrollBridgeRouter(deploy, remoteDeploy)
    }
  }
}

/**
 * Enroll a single chain's BridgeRouter as remote routers
 * on a single chain's BridgeRouter
 *
 * @param local - The deploy instance for the chain on which to enroll the router
 * @param remote - The deploy instance for the chain to enroll on the local router
 */
export async function enrollBridgeRouter(local: BridgeDeploy, remote: BridgeDeploy) {
  console.log(`enrolling ${remote.chain.name} BridgeRouter on ${local.chain.name}`);

  // TODO: we don't have the domain (yet)
  let tx = await local.contracts.bridgeRouter!.enrollRemoteRouter(
      remote.chain.domain,
      toBytes32(remote.contracts.bridgeRouter!.address),
      { gasPrice: local.chain.gasPrice },
  );

  await tx.wait(5);

  console.log(`enrolled ${remote.chain.name} BridgeRouter on ${local.chain.name}`);
}

/**
 * Transfer Ownership of a chain's BridgeRouter
 * to its GovernanceRouter
 *
 * @param deploy - The deploy instance for the chain
 */
export async function transferOwnershipToGovernance(deploy: BridgeDeploy) {
  console.log(`transfer ownership of ${deploy.chain.name} BridgeRouter`);

  let tx = await deploy.contracts.bridgeRouter!.transferOwnership(
      deploy.coreContractAddresses.governance.proxy,
      { gasPrice: deploy.chain.gasPrice },
  );

  await tx.wait(5);

  console.log(`transferred ownership of ${deploy.chain.name} BridgeRouter`);
}

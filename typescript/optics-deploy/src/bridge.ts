import {
  Chain,
  ContractDeployOutput,
  ContractVerificationInput,
  ChainConfig,
  toChain
} from './chain';
import {parseFileFromDeploy} from "./readDeployOutput";
import * as xAppContracts from "../../typechain/optics-xapps";
import * as contracts from "../../typechain/optics-core";
import {toBytes32} from "../../optics-tests/lib/utils";
import fs from "fs";
import * as ethers from "ethers";

export type BridgeContracts = {
  bridgeRouter?: xAppContracts.BridgeRouter
};

export class BridgeDeploy {
  readonly coreDeployPath: string;
  readonly coreContractAddresses: ContractDeployOutput;
  readonly chain: Chain;
  contracts: BridgeContracts;
  verificationInput: ContractVerificationInput[];

  constructor(chain: Chain, coreDeployPath: string) {
    this.chain = chain;
    this.contracts = {};
    this.verificationInput = [];
    this.coreDeployPath = coreDeployPath;
    this.coreContractAddresses = parseFileFromDeploy(
        coreDeployPath,
        chain.config.name,
        'contracts',
    );
  }

  static freshFromConfig(config: ChainConfig, coreDeployPath: string): BridgeDeploy {
    return new BridgeDeploy(toChain(config), coreDeployPath);
  }

  get deployer(): ethers.Signer {
    return this.chain.deployer;
  }

  get provider(): ethers.providers.Provider {
    return this.chain.provider;
  }

  get supports1559(): boolean {
    let notSupported = ['kovan', 'alfajores', 'baklava', 'celo'];
    return notSupported.indexOf(this.chain.name) === -1;
  }

  // this is currently a kludge to account for ethers issues
  get overrides(): ethers.Overrides {
    return {
      type: this.supports1559 ? 2 : 0,
      gasPrice: this.chain.gasPrice,
      gasLimit: this.supports1559 ? undefined : 5_000_000,
    };
  }
}


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
export function getBridgeDeploy(config: ChainConfig, coreDeployPath: string): BridgeDeploy {
  return BridgeDeploy.freshFromConfig(config, coreDeployPath);
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
  const deployPromises: Promise<void>[] = [];
  for(let deploy of deploys) {
    deployPromises.push(deployBridgeRouter(deploy));
  }
  await Promise.all(deployPromises);


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
  await Promise.all(transferPromises);

  // output the Bridge deploy information to a subdirectory
  // of the core system deploy config folder
  writeBridgeDeployOutput(deploys);
}

/**
 * Deploys the BridgeRouter on the chain of the given deploy and updates
 * the deploy instance with the new contract.
 *
 * @param deploy - The deploy instance
 */
async function deployBridgeRouter(deploy: BridgeDeploy) {
  console.log(`deploying ${deploy.chain.name} BridgeRouter`);

  let factory = new xAppContracts.BridgeRouter__factory(
      deploy.chain.deployer,
  );

  const bridgeRouter = await factory.deploy(deploy.coreContractAddresses.xappConnectionManager, deploy.overrides);

  await bridgeRouter.deployTransaction.wait(deploy.chain.confirmations);

  deploy.contracts.bridgeRouter = bridgeRouter;

  // add contract information to Etherscan verification array
  deploy.verificationInput.push({
    name: "BridgeRouter",
    address: bridgeRouter!.address,
    constructorArguments: [deploy.coreContractAddresses.xappConnectionManager]
  });

  console.log(`deployed ${deploy.chain.name} BridgeRouter`);
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

  const remoteHome: contracts.Home = contracts.Home__factory.connect(remote.coreContractAddresses.home.proxy, remote.chain.deployer);
  const remoteDomain = await remoteHome.localDomain();

  let tx = await local.contracts.bridgeRouter!.enrollRemoteRouter(
      remoteDomain,
      toBytes32(remote.contracts.bridgeRouter!.address),
      local.overrides,
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
      deploy.overrides,
  );

  await tx.wait(5);

  console.log(`transferred ownership of ${deploy.chain.name} BridgeRouter`);
}

/**
 * Outputs the values for bridges that have been deployed.
 *
 * @param deploys - The array of bridge deploys
 */
export function writeBridgeDeployOutput(deploys: BridgeDeploy[]) {
  console.log(`Have ${deploys.length} bridge deploys`);
  if(deploys.length == 0) {
    return;
  }

  // ensure bridge directory exists within core deploy config folder
  const root = `${deploys[0].coreDeployPath}/bridge`;
  fs.mkdirSync(root, { recursive: true });

  // create dir for this bridge deploy's outputs
  const dir = `${root}/${Date.now()}`;
  fs.mkdirSync(dir, { recursive: true });

  // for each deploy, write contracts and verification inputs to file
  for (const deploy of deploys) {
    const name = deploy.chain.name;
    const contracts = {
      bridgeRouter: deploy.contracts.bridgeRouter!.address
    };
    fs.writeFileSync(`${dir}/${name}_contracts.json`, JSON.stringify(contracts, null, 2));
    fs.writeFileSync(
        `${dir}/${name}_verification.json`,
        JSON.stringify(deploy.verificationInput, null, 2),
    );
  }
}
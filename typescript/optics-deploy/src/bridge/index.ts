import * as proxyUtils from '../proxyUtils';

import * as xAppContracts from '../../../typechain/optics-xapps';
import * as contracts from '../../../typechain/optics-core';
import { toBytes32 } from '../../../optics-tests/lib/utils';
import fs from 'fs';
import { BridgeDeploy } from '../deploy';

export type BridgeDeployOutput = {
  bridgeRouter?: string;
};

/**
 * Deploy and configure a cross-chain token bridge system
 * with one BridgeRouter on each of the provided chains
 * with ownership delegated to Optics governance
 *
 * @param deploys - The list of deploy instances for each chain
 */
export async function deployBridges(deploys: BridgeDeploy[]) {
  // deploy BridgeTokens & BridgeRouters
  await Promise.all(
    deploys.map(async (deploy) => {
      // Must be done in order per-deploy.
      // Do not rearrange or parallelize.
      await deployTokenUpgradeBeacon(deploy);
      await deployBridgeRouter(deploy);
      await deployEthHelper(deploy);
    }),
  );

  // after all BridgeRouters have been deployed,
  // enroll peer BridgeRouters with each other
  await Promise.all(
    deploys.map(async (deploy) => {
      await enrollAllBridgeRouters(deploy, deploys);
    }),
  );

  // after all peer BridgeRouters have been co-enrolled,
  // transfer ownership of BridgeRouters to Governance
  await Promise.all(
    deploys.map(async (deploy) => {
      await transferOwnershipToGovernance(deploy);
    }),
  );

  // output the Bridge deploy information to a subdirectory
  // of the core system deploy config folder
  writeBridgeDeployOutput(deploys);
}

/**
 * Deploys the BridgeToken implementation + upgrade beacon
 * on the chain of the given deploy
 * and updates the deploy instance with the new contracts.
 *
 * @param deploy - The deploy instance
 */
async function deployTokenUpgradeBeacon(deploy: BridgeDeploy) {
  console.log(`deploying ${deploy.chain.name} Token Upgrade Beacon`);

  // no initialize function called
  const initData = '0x';

  deploy.contracts.bridgeToken =
    await proxyUtils.deployProxy<xAppContracts.BridgeToken>(
      deploy,
      new xAppContracts.BridgeToken__factory(deploy.chain.deployer),
      initData,
    );

  console.log(`deployed ${deploy.chain.name} Token Upgrade Beacon`);
}

/**
 * Deploys the BridgeRouter on the chain of the given deploy and updates
 * the deploy instance with the new contract.
 *
 * @param deploy - The deploy instance
 */
async function deployBridgeRouter(deploy: BridgeDeploy) {
  console.log(`deploying ${deploy.chain.name} BridgeRouter`);

  const initData =
    xAppContracts.BridgeRouter__factory.createInterface().encodeFunctionData(
      'initialize',
      [
        deploy.contracts.bridgeToken!.beacon.address,
        deploy.coreContractAddresses.xappConnectionManager,
      ],
    );

  deploy.contracts.bridgeRouter =
    await proxyUtils.deployProxy<xAppContracts.BridgeRouter>(
      deploy,
      new xAppContracts.BridgeRouter__factory(deploy.chain.deployer),
      initData,
    );

  console.log(`deployed ${deploy.chain.name} BridgeRouter`);
}

/**
 * Deploy the Eth Helper contract if configured.
 *
 * Chains with no WETH configuration will not have an eth helper contract.
 *
 * @param deploy - The deploy instance for the chain on which to deploy the contract
 */
export async function deployEthHelper(deploy: BridgeDeploy) {
  if (!deploy.config.weth) {
    return;
  }

  const factory = new xAppContracts.ETHHelper__factory(deploy.chain.deployer);

  deploy.contracts.ethHelper = await factory.deploy(
    deploy.config.weth!,
    deploy.contracts.bridgeRouter?.proxy.address!,
  );
  await deploy.contracts.ethHelper.deployTransaction.wait(5);
}

/**
 * Enroll all other chains' BridgeRouters as remote routers
 * to a single chain's BridgeRouter
 *
 * @param deploy - The deploy instance for the chain on which to enroll routers
 * @param allDeploys - Array of all deploy instances for the Bridge deploy
 */
export async function enrollAllBridgeRouters(
  deploy: BridgeDeploy,
  allDeploys: BridgeDeploy[],
) {
  for (let remoteDeploy of allDeploys) {
    if (deploy.chain.name != remoteDeploy.chain.name) {
      await enrollBridgeRouter(deploy, remoteDeploy);
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
export async function enrollBridgeRouter(
  local: BridgeDeploy,
  remote: BridgeDeploy,
) {
  console.log(
    `enrolling ${remote.chain.name} BridgeRouter on ${local.chain.name}`,
  );

  const remoteHome: contracts.Home = contracts.Home__factory.connect(
    remote.coreContractAddresses.home.proxy,
    remote.chain.deployer,
  );
  const remoteDomain = await remoteHome.localDomain();

  let tx = await local.contracts.bridgeRouter!.proxy.enrollRemoteRouter(
    remoteDomain,
    toBytes32(remote.contracts.bridgeRouter!.proxy.address),
    local.overrides,
  );

  await tx.wait(5);

  console.log(
    `enrolled ${remote.chain.name} BridgeRouter on ${local.chain.name}`,
  );
}

/**
 * Transfer Ownership of a chain's BridgeRouter
 * to its GovernanceRouter
 *
 * @param deploy - The deploy instance for the chain
 */
export async function transferOwnershipToGovernance(deploy: BridgeDeploy) {
  console.log(`transfer ownership of ${deploy.chain.name} BridgeRouter`);

  let tx = await deploy.contracts.bridgeRouter!.proxy.transferOwnership(
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
  if (deploys.length == 0) {
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

    const contracts = deploy.contracts.toJsonPretty();
    fs.writeFileSync(`${dir}/${name}_contracts.json`, contracts);

    fs.writeFileSync(
      `${dir}/${name}_verification.json`,
      JSON.stringify(deploy.verificationInput, null, 2),
    );
  }
}

import {Chain, ChainJson, CoreContractAddresses, toChain} from '../chain';
import {BridgeContractAddresses, BridgeContracts} from './BridgeContracts';
import {getPathToLatestConfig, parseFileFromDeploy} from '../verification/readDeployOutput';
import { Deploy } from '../deploy';
import fs from "fs";

export type BridgeConfig = {
  weth?: string;
};

export class BridgeDeploy extends Deploy<BridgeContracts> {
  readonly config: BridgeConfig;
  readonly coreDeployPath: string;
  readonly coreContractAddresses: CoreContractAddresses;
  readonly test: boolean;

  constructor(
    chain: Chain,
    config: BridgeConfig,
    coreDeployPath: string,
    test: boolean = false,
    coreContracts?: CoreContractAddresses
  ) {
    super(chain, new BridgeContracts(), test);
    this.config = config;
    this.coreDeployPath = coreDeployPath;
    this.coreContractAddresses = coreContracts || parseFileFromDeploy(
      coreDeployPath,
      chain.config.name,
      'contracts',
    );
    this.test = test;
  }

  get ubcAddress(): string | undefined {
    return this.coreContractAddresses.upgradeBeaconController;
  }

  static freshFromConfig(
    config: ChainJson,
    coreDeployPath: string,
  ): BridgeDeploy {
    return new BridgeDeploy(toChain(config), {}, coreDeployPath);
  }
}

export class ExistingBridgeDeploy extends BridgeDeploy {
  constructor(
      chain: Chain,
      config: BridgeConfig,
      coreDeployPath: string,
      test: boolean = false,
      coreContracts?: CoreContractAddresses
  ) {
    super(chain, config, coreDeployPath, test, coreContracts);
    const bridgeConfigPath = getPathToLatestConfig(`${coreDeployPath}/bridge`);
    const addresses: BridgeContractAddresses = JSON.parse(fs.readFileSync(`${bridgeConfigPath}/${chain.name}_contracts.json`) as any as string);
    this.contracts = BridgeContracts.fromAddresses(addresses, chain.provider);
  }
}
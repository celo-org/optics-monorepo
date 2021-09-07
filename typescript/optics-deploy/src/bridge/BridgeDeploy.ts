import { Chain, ChainJson, CoreContractAddresses, toChain } from '../chain';
import { BridgeContracts } from './BridgeContracts';
import { parseFileFromDeploy } from '../verification/readDeployOutput';
import { Deploy } from '../deploy';

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

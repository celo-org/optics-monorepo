import { ethers } from 'ethers';
import {
  Chain,
  ChainJson,
  CoreContractDeployOutput,
  RustConfig,
  toChain,
} from './chain';
import { BridgeContracts, Contracts, CoreContracts } from './contracts';
import { parseFileFromDeploy } from './readDeployOutput';

export type ContractVerificationInput = {
  name: string;
  address: string;
  constructorArguments: any[];
};

export type CoreConfig = {
  updater: string;
  recoveryTimelock: number;
  recoveryManager: string;
  optimisticSeconds: number;
  watchers: string[];
};

export type BridgeConfig = {
  weth?: string;
};

export abstract class Deploy<T extends Contracts> {
  readonly chain: Chain;
  readonly test: boolean;
  contracts: T;
  verificationInput: ContractVerificationInput[];

  abstract get ubcAddress(): string | undefined;

  constructor(chain: Chain, contracts: T, test: boolean = false) {
    this.chain = chain;
    this.verificationInput = [];
    this.test = test;
    this.contracts = contracts;
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

export class CoreDeploy extends Deploy<CoreContracts> {
  config: CoreConfig;

  constructor(chain: Chain, config: CoreConfig, test: boolean = false) {
    super(chain, new CoreContracts(), test);
    this.config = config;
  }

  get ubcAddress(): string | undefined {
    return this.contracts.upgradeBeaconController?.address;
  }

  static parseCoreConfig(config: ChainJson & CoreConfig): [Chain, CoreConfig] {
    const chain = toChain(config);
    return [
      chain,
      {
        updater: config.updater,
        watchers: config.watchers ?? [],
        recoveryManager: config.recoveryManager,
        recoveryTimelock: config.recoveryTimelock,
        optimisticSeconds: config.optimisticSeconds,
      },
    ];
  }

  static toRustConfigs(deploys: CoreDeploy[]): RustConfig[] {
    let configs: RustConfig[] = [];
    for (let i = 0; i < deploys.length; i++) {
      const local = deploys[i];

      // copy array so original is not altered
      const remotes = deploys
        .slice()
        .filter((remote) => remote.chain.domain !== local.chain.domain);

      // build and add new config
      configs.push(CoreDeploy.buildConfig(local, remotes));
    }
    return configs;
  }

  static buildConfig(local: CoreDeploy, remotes: CoreDeploy[]): RustConfig {
    const home = {
      address: local.contracts.home!.proxy.address,
      domain: local.chain.domain.toString(),
      name: local.chain.name,
      rpcStyle: 'ethereum', // TODO
      connection: {
        type: 'http', // TODO
        url: local.chain.config!.rpc,
      },
    };

    const rustConfig: RustConfig = {
      signers: {
        [home.name]: { key: '', type: 'hexKey' },
      },
      replicas: {},
      home,
      tracing: {
        level: 'debug',
        style: 'pretty',
      },
      db: 'db_path',
    };

    for (var remote of remotes) {
      const replica = {
        address: remote.contracts.replicas[local.chain.domain].proxy.address,
        domain: remote.chain.domain.toString(),
        name: remote.chain.name,
        rpcStyle: 'ethereum',
        connection: {
          type: 'http',
          url: remote.chain.config!.rpc,
        },
      };

      rustConfig.signers[replica.name] = { key: '', type: 'hexKey' };
      rustConfig.replicas[replica.name] = replica;
    }

    return rustConfig;
  }

  static freshFromConfig(chainConfig: ChainJson & CoreConfig): CoreDeploy {
    let [chain, config] = CoreDeploy.parseCoreConfig(chainConfig);
    return new CoreDeploy(chain, config);
  }
}

export class BridgeDeploy extends Deploy<BridgeContracts> {
  readonly config: BridgeConfig;
  readonly coreDeployPath: string;
  readonly coreContractAddresses: CoreContractDeployOutput;

  constructor(
    chain: Chain,
    config: BridgeConfig,
    coreDeployPath: string,
    test: boolean = false,
  ) {
    super(chain, new BridgeContracts(), test);
    this.config = config;
    this.coreDeployPath = coreDeployPath;
    this.coreContractAddresses = parseFileFromDeploy(
      coreDeployPath,
      chain.config.name,
      'contracts',
    );
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

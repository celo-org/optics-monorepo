import {
  Chain,
  ChainJson,
  DeployEnvironment,
  RustConfig,
  toChain,
} from '../chain';
import { CoreContracts } from './CoreContracts';
import { Deploy } from '../deploy';

export type CoreConfig = {
  environment: DeployEnvironment;
  updater: string;
  recoveryTimelock: number;
  recoveryManager: string;
  optimisticSeconds: number;
  watchers: string[];
};

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
        environment: config.environment,
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
      rpcStyle: 'ethereum',
      connection: {
        type: 'http',
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
        style: 'json',
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

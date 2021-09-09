import * as ethers from 'ethers';
import { BridgeContracts } from './bridge';
import { CoreContracts } from './core';
import { Domain, mainnetDomains } from './domains';

type Provider = ethers.providers.Provider;

export class MultiProvider {
  private domains: Record<number, Domain>;
  private providers: Record<number, Provider>;
  private signers: Record<number, ethers.Signer>;

  constructor() {
    this.domains = {};
    this.providers = {};
    this.signers = {};
  }

  registerDomain(data: Domain) {
    this.domains[data.domain] = data;
  }

  getDomain(domain: number): Domain | undefined {
    return this.domains[domain];
  }

  registerProvider(domain: number, provider: Provider) {
    if (!this.domains[domain]) {
      throw new Error('Must have domain to register provider');
    }
    this.providers[domain] = provider;
    if (this.signers[domain]) {
      this.signers[domain] = this.signers[domain].connect(provider);
    }
  }

  registerRpcProvider(domain: number, rpc: string) {
    const provider = new ethers.providers.JsonRpcProvider(rpc);
    this.registerProvider(domain, provider);
  }

  getProvider(domain: number): Provider | undefined {
    return this.providers[domain];
  }

  registerSigner(domain: number, signer: ethers.Signer) {
    if (!this.providers[domain] && !signer.provider) {
      throw new Error('Must have a provider before registering signer');
    }

    if (this.providers[domain]) {
      this.signers[domain] = signer.connect(this.providers[domain]);
    } else {
      this.registerProvider(domain, signer.provider!);
      this.signers[domain] = signer;
    }
  }

  registerWalletSigner(domain: number, privkey: string) {
    const wallet = new ethers.Wallet(privkey);
    this.registerSigner(domain, wallet);
  }

  getSigner(domain: number): ethers.Signer | undefined {
    return this.signers[domain];
  }
}

export class OpticsContext extends MultiProvider {
  private cores: Record<number, CoreContracts>;
  private bridges: Record<number, BridgeContracts>;

  constructor(cores: CoreContracts[], bridges: BridgeContracts[]) {
    super();
    this.cores = {};
    this.bridges = {};

    cores.forEach((core) => {
      this.cores[core.domain] = core;
    });
    bridges.forEach((bridge) => {
      this.bridges[bridge.domain] = bridge;
    });
  }

  static fromDomains(domains: Domain[]): OpticsContext {
    const cores = domains.map((domain) => CoreContracts.fromObject(domain));
    const bridges = domains.map((domain) => BridgeContracts.fromObject(domain));
    return new OpticsContext(cores, bridges);
  }

  registerProvider(domain: number, provider: ethers.providers.Provider) {
    super.registerProvider(domain, provider);

    // re-register contracts
    const connection = this.getSigner(domain) ?? this.getProvider(domain)!;
    if (this.cores[domain]) {
      this.cores[domain].connect(connection);
    }
    if (this.bridges[domain]) {
      this.bridges[domain].connect(connection);
    }
  }

  registerSigner(domain: number, signer: ethers.Signer) {
    super.registerSigner(domain, signer);
    // re-register contracts
    if (this.cores[domain]) {
      this.cores[domain].connect(signer);
    }
    if (this.bridges[domain]) {
      this.bridges[domain].connect(signer);
    }
  }

  getCore(domain: number): CoreContracts | undefined {
    return this.cores[domain];
  }

  getBridge(domain: number): BridgeContracts | undefined {
    return this.bridges[domain];
  }
}

export const mainnet = OpticsContext.fromDomains(mainnetDomains);

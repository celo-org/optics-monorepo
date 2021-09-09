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

  registerDomain(domain: Domain) {
    this.domains[domain.domain] = domain;
  }

  getDomain(domain: number): Domain | undefined {
    return this.domains[domain];
  }

  resolveDomain(nameOrDomain: string | number): number {
    if (typeof nameOrDomain === 'string') {
      return Object.values(this.domains).filter(
        (domain) => domain.name === nameOrDomain,
      )[0].domain;
    } else {
      return nameOrDomain;
    }
  }

  registerProvider(nameOrDomain: string | number, provider: Provider) {
    const domain = this.resolveDomain(nameOrDomain);

    if (!this.domains[domain]) {
      throw new Error('Must have domain to register provider');
    }

    this.providers[domain] = provider;
    if (this.signers[domain]) {
      this.signers[domain] = this.signers[domain].connect(provider);
    }
  }

  registerRpcProvider(nameOrDomain: string | number, rpc: string) {
    const domain = this.resolveDomain(nameOrDomain);

    const provider = new ethers.providers.JsonRpcProvider(rpc);
    this.registerProvider(domain, provider);
  }

  getProvider(nameOrDomain: string | number): Provider | undefined {
    const domain = this.resolveDomain(nameOrDomain);

    return this.providers[domain];
  }

  registerSigner(nameOrDomain: string | number, signer: ethers.Signer) {
    const domain = this.resolveDomain(nameOrDomain);

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

  registerWalletSigner(nameOrDomain: string | number, privkey: string) {
    const domain = this.resolveDomain(nameOrDomain);

    const wallet = new ethers.Wallet(privkey);
    this.registerSigner(domain, wallet);
  }

  getSigner(nameOrDomain: string | number): ethers.Signer | undefined {
    const domain = this.resolveDomain(nameOrDomain);
    return this.signers[domain];
  }
}

export class OpticsContext extends MultiProvider {
  private cores: Record<number, CoreContracts>;
  private bridges: Record<number, BridgeContracts>;

  constructor(
    domains: Domain[],
    cores: CoreContracts[],
    bridges: BridgeContracts[],
  ) {
    super();
    domains.forEach((domain) => this.registerDomain(domain));
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
    return new OpticsContext(domains, cores, bridges);
  }

  registerProvider(
    nameOrDomain: string | number,
    provider: ethers.providers.Provider,
  ) {
    const domain = this.resolveDomain(nameOrDomain);
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

  registerSigner(nameOrDomain: string | number, signer: ethers.Signer) {
    const domain = this.resolveDomain(nameOrDomain);

    super.registerSigner(domain, signer);
    // re-register contracts
    if (this.cores[domain]) {
      this.cores[domain].connect(signer);
    }
    if (this.bridges[domain]) {
      this.bridges[domain].connect(signer);
    }
  }

  getCore(nameOrDomain: string | number): CoreContracts | undefined {
    const domain = this.resolveDomain(nameOrDomain);

    return this.cores[domain];
  }

  getBridge(nameOrDomain: string | number): BridgeContracts | undefined {
    const domain = this.resolveDomain(nameOrDomain);

    return this.bridges[domain];
  }
}

export const mainnet = OpticsContext.fromDomains(mainnetDomains);

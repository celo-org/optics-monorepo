import { ethers } from 'ethers';
import { Domain } from './domains';

type Provider = ethers.providers.Provider;

export class MultiProvider {
  private domains: Map<number, Domain>;
  private providers: Map<number, Provider>;
  private signers: Map<number, ethers.Signer>;

  constructor() {
    this.domains = new Map();
    this.providers = new Map();
    this.signers = new Map();
  }

  registerDomain(domain: Domain): void {
    this.domains.set(domain.id, domain);
  }

  get domainNumbers(): number[] {
    return Array.from(this.domains.keys());
  }

  get missingProviders(): number[] {
    const numbers = this.domainNumbers;
    return numbers.filter((number) => this.providers.has(number));
  }

  resolveDomain(nameOrDomain: string | number): number {
    if (typeof nameOrDomain === 'string') {
      const domains = Array.from(this.domains.values()).filter(
        (domain) => domain.name.toLowerCase() === nameOrDomain.toLowerCase(),
      );
      if (domains.length === 0) {
        throw new Error(`Domain not found: ${nameOrDomain}`);
      }
      return domains[0].id;
    } else {
      return nameOrDomain;
    }
  }

  knownDomain(nameOrDomain: string | number): boolean {
    try {
      this.resolveDomain(nameOrDomain);
      return true;
    } catch (e) {
      return false;
    }
  }

  getDomain(nameOrDomain: number | string): Domain | undefined {
    return this.domains.get(this.resolveDomain(nameOrDomain));
  }

  mustGetDomain(nameOrDomain: number | string): Domain {
    const domain = this.getDomain(nameOrDomain);
    if (!domain) {
      throw new Error(`Domain not found: ${nameOrDomain}`);
    }

    return domain;
  }

  resolveDomainName(nameOrDomain: number | string): string | undefined {
    return this.getDomain(nameOrDomain)?.name;
  }

  registerProvider(nameOrDomain: string | number, provider: Provider): void {
    const domain = this.mustGetDomain(nameOrDomain).id;
    try {
      const signer = this.signers.get(domain);
      if (signer) {
        this.signers.set(domain, signer.connect(provider));
      }
    } catch (e) {
      this.unregisterSigner(domain);
    }
    this.providers.set(domain, provider);
  }

  registerRpcProvider(nameOrDomain: string | number, rpc: string): void {
    const domain = this.resolveDomain(nameOrDomain);

    const provider = new ethers.providers.StaticJsonRpcProvider(rpc);
    this.registerProvider(domain, provider);
  }

  getProvider(nameOrDomain: string | number): Provider | undefined {
    const domain = this.resolveDomain(nameOrDomain);

    return this.providers.get(domain);
  }

  mustGetProvider(nameOrDomain: string | number): Provider {
    const provider = this.getProvider(nameOrDomain);
    if (!provider) {
      throw new Error('unregistered name or domain');
    }
    return provider;
  }

  registerSigner(nameOrDomain: string | number, signer: ethers.Signer): void {
    const domain = this.resolveDomain(nameOrDomain);

    const provider = this.providers.get(domain);
    if (!provider && !signer.provider) {
      throw new Error('Must have a provider before registering signer');
    }

    if (provider) {
      try {
        signer = signer.connect(provider);
        this.signers.set(domain, signer.connect(provider));
        return;
      } catch (_) {
        // do nothing
      }
    }
    if (!signer.provider) {
      throw new Error('Signer does not permit reconnect and has no provider');
    }
    // else and fallback
    this.registerProvider(domain, signer.provider);
    this.signers.set(domain, signer);
  }

  unregisterSigner(nameOrDomain: string | number): void {
    const domain = this.resolveDomain(nameOrDomain);
    if (!this.signers.has(domain)) {
      return;
    }

    const signer = this.signers.get(domain);
    if (signer == null || signer.provider == null) {
      throw new Error('signer was missing provider. How?');
    }

    this.signers.delete(domain);
    if (!this.getProvider(nameOrDomain)) {
      this.providers.set(domain, signer.provider);
    }
  }

  clearSigners(): void {
    this.domainNumbers.forEach((domain) => this.unregisterSigner(domain));
  }

  registerWalletSigner(nameOrDomain: string | number, privkey: string): void {
    const domain = this.resolveDomain(nameOrDomain);

    const wallet = new ethers.Wallet(privkey);
    this.registerSigner(domain, wallet);
  }

  getSigner(nameOrDomain: string | number): ethers.Signer | undefined {
    const domain = this.resolveDomain(nameOrDomain);
    return this.signers.get(domain);
  }

  getConnection(
    nameOrDomain: string | number,
  ): ethers.Signer | ethers.providers.Provider | undefined {
    return this.getSigner(nameOrDomain) ?? this.getProvider(nameOrDomain);
  }

  async getAddress(nameOrDomain: string | number): Promise<string | undefined> {
    const signer = this.getSigner(nameOrDomain);
    return await signer?.getAddress();
  }
}

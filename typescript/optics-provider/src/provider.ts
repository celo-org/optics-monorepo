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

  registerDomain(domain: Domain) {
    this.domains.set(domain.domain, domain);
  }

  getDomain(domain: number): Domain | undefined {
    return this.domains.get(domain);
  }

  get domainNumbers(): number[] {
    return Array.from(this.domains.keys());
  }

  resolveDomain(nameOrDomain: string | number): number {
    if (typeof nameOrDomain === 'string') {
      return Array.from(this.domains.values()).filter(
        (domain) => domain.name === nameOrDomain,
      )[0].domain;
    } else {
      return nameOrDomain;
    }
  }

  registerProvider(nameOrDomain: string | number, provider: Provider) {
    const domain = this.resolveDomain(nameOrDomain);

    if (!this.domains.get(domain)) {
      throw new Error('Must have domain to register provider');
    }

    this.providers.set(domain, provider);
    const signer = this.signers.get(domain);
    if (signer) {
      this.signers.set(domain, signer.connect(provider));
    }
  }

  registerRpcProvider(nameOrDomain: string | number, rpc: string) {
    const domain = this.resolveDomain(nameOrDomain);

    const provider = new ethers.providers.JsonRpcProvider(rpc);
    this.registerProvider(domain, provider);
  }

  getProvider(nameOrDomain: string | number): Provider | undefined {
    const domain = this.resolveDomain(nameOrDomain);

    return this.providers.get(domain);
  }

  registerSigner(nameOrDomain: string | number, signer: ethers.Signer) {
    const domain = this.resolveDomain(nameOrDomain);

    const provider = this.providers.get(domain);
    if (!provider && !signer.provider) {
      throw new Error('Must have a provider before registering signer');
    }

    if (provider) {
      this.signers.set(domain, signer.connect(provider));
    } else {
      this.registerProvider(domain, signer.provider!);
      this.signers.set(domain, signer);
    }
  }

  unregisterSigner(nameOrDomain: string | number) {
    this.signers.delete(this.resolveDomain(nameOrDomain));
  }

  registerWalletSigner(nameOrDomain: string | number, privkey: string) {
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

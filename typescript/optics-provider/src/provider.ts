import * as ethers from 'ethers';
import * as core from '../../typechain/optics-core';
import * as xapps from '../../typechain/optics-xapps';
import { Domain } from './domains';

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

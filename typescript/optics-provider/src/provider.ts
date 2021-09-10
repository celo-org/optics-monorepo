import * as ethers from 'ethers';
import { BigNumberish, ContractTransaction } from 'ethers';
import { ERC20, ERC20__factory } from '../../typechain/optics-xapps';
import { BridgeContracts } from './contracts/bridge';
import { CoreContracts } from './contracts/core';
import { Domain, mainnetDomains } from './domains';
import { ResolvedTokenInfo, TokenIdentifier } from './tokens';
import { canonizeId } from './utils';

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

type Address = string;

export class OpticsContext extends MultiProvider {
  private cores: Map<number, CoreContracts>;
  private bridges: Map<number, BridgeContracts>;

  constructor(
    domains: Domain[],
    cores: CoreContracts[],
    bridges: BridgeContracts[],
  ) {
    super();
    domains.forEach((domain) => this.registerDomain(domain));
    this.cores = new Map();
    this.bridges = new Map();

    cores.forEach((core) => {
      this.cores.set(core.domain, core);
    });
    bridges.forEach((bridge) => {
      this.bridges.set(bridge.domain, bridge);
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
    const connection = this.getConnection(domain);
    if (!connection) {
      return;
    }

    const core = this.cores.get(domain);
    if (core) {
      core.connect(connection);
    }
    const bridge = this.bridges.get(domain);
    if (bridge) {
      bridge.connect(connection);
    }
  }

  registerSigner(nameOrDomain: string | number, signer: ethers.Signer) {
    const domain = this.resolveDomain(nameOrDomain);

    super.registerSigner(domain, signer);
    // re-register contracts
    const core = this.cores.get(domain);
    if (core) {
      core.connect(signer);
    }
    const bridge = this.bridges.get(domain);
    if (bridge) {
      bridge.connect(signer);
    }
  }

  getCore(nameOrDomain: string | number): CoreContracts | undefined {
    const domain = this.resolveDomain(nameOrDomain);
    return this.cores.get(domain);
  }

  getBridge(nameOrDomain: string | number): BridgeContracts | undefined {
    const domain = this.resolveDomain(nameOrDomain);

    return this.bridges.get(domain);
  }

  // resolve the local repr of a token on its domain
  async resolveTokenRepresentation(
    nameOrDomain: string | number,
    token: TokenIdentifier,
  ): Promise<ERC20 | undefined> {
    const domain = this.resolveDomain(nameOrDomain);
    const bridge = this.getBridge(domain);

    const tokenDomain = this.resolveDomain(token.domain);
    const tokenId = canonizeId(token.id);

    const address = await bridge?.bridgeRouter[
      'getLocalAddress(uint32,bytes32)'
    ](tokenDomain, tokenId);

    if (!address) {
      return;
    }

    let contract = new ERC20__factory().attach(address);

    const connection = this.getConnection(domain);
    if (connection) {
      contract = contract.connect(connection);
    }
    return contract;
  }

  // resolve all token representations
  async tokenRepresentations(
    token: TokenIdentifier,
  ): Promise<ResolvedTokenInfo> {
    const tokens: Map<number, ERC20> = new Map();

    await Promise.all(
      this.domainNumbers.map(async (domain) => {
        let tok = await this.resolveTokenRepresentation(domain, token);
        if (tok) {
          tokens.set(domain, tok);
        }
      }),
    );

    return {
      domain: this.resolveDomain(token.domain),
      id: token.id,
      tokens,
    };
  }

  async resolveCanonicalToken(
    nameOrDomain: string | number,
    representation: Address,
  ): Promise<TokenIdentifier | undefined> {
    const bridge = this.getBridge(nameOrDomain);
    if (!bridge) {
      throw new Error(`Bridge not available on ${nameOrDomain}`);
    }

    const token = await bridge.bridgeRouter.getCanonicalAddress(representation);
    if (token[0] === 0) {
      return;
    }
    return {
      domain: token[0],
      id: token[1],
    };
  }

  // send tokens from domain to domain
  async send(
    from: string | number,
    to: string | number,
    token: TokenIdentifier,
    amount: BigNumberish,
    recipient: Address,
  ): Promise<ContractTransaction> {
    const fromBridge = this.getBridge(from);
    if (!fromBridge) {
      throw new Error(`Bridge not available on ${from}`);
    }

    const fromToken = await this.resolveTokenRepresentation(from, token);
    if (!fromToken) {
      throw new Error(`Token not available on ${from}`);
    }

    const bridgeAddress = fromBridge?.bridgeRouter.address;
    if (!bridgeAddress) {
      throw new Error(`No bridge for ${from}`);
    }

    const sender = this.getSigner(from);
    if (!sender) {
      throw new Error(`No signer for ${from}`);
    }
    const senderAddress = await sender.getAddress();

    const approved = await fromToken.allowance(senderAddress, bridgeAddress);

    // Approve if necessary
    if (approved.lt(amount)) {
      await fromToken.approve(bridgeAddress, amount);
    }

    return fromBridge.bridgeRouter.send(
      fromToken.address,
      amount,
      to,
      recipient,
    );
  }

  async sendNative(
    from: string | number,
    to: string | number,
    amount: BigNumberish,
    recipient: Address,
  ): Promise<ContractTransaction> {
    const ethHelper = this.getBridge(from)?.ethHelper;
    if (!ethHelper) {
      throw new Error(`No ethHelper for ${from}`);
    }

    const toDomain = this.resolveDomain(to);

    return ethHelper.sendToEVMLike(toDomain, recipient, { value: amount });
  }
}

export const mainnet = OpticsContext.fromDomains(mainnetDomains);

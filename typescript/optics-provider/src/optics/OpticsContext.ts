import { BigNumberish, ethers } from 'ethers';
import { MultiProvider } from '..';
import { xapps, core } from '@optics-xyz/ts-interface';
import { BridgeContracts } from './contracts/BridgeContracts';
import { CoreContracts } from './contracts/CoreContracts';
import { ResolvedTokenInfo, TokenIdentifier } from './tokens';
import { canonizeId } from '../utils';
import {
  devDomains,
  mainnetDomains,
  OpticsDomain,
  stagingDomains,
} from './domains';
import { TransferMessage } from './messages';

type Address = string;

export class OpticsContext extends MultiProvider {
  private cores: Map<number, CoreContracts>;
  private bridges: Map<number, BridgeContracts>;

  constructor(
    domains: OpticsDomain[],
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

  static fromDomains(domains: OpticsDomain[]): OpticsContext {
    const cores = domains.map((domain) => CoreContracts.fromObject(domain));
    const bridges = domains.map((domain) => BridgeContracts.fromObject(domain));
    return new OpticsContext(domains, cores, bridges);
  }

  private reconnect(domain: number) {
    const connection = this.getConnection(domain);
    if (!connection) {
      throw new Error('Reconnect failed: no connection');
    }
    // re-register contracts
    const core = this.cores.get(domain);
    if (core) {
      core.connect(connection);
    }
    const bridge = this.bridges.get(domain);
    if (bridge) {
      bridge.connect(connection);
    }
  }

  registerProvider(
    nameOrDomain: string | number,
    provider: ethers.providers.Provider,
  ) {
    const domain = this.resolveDomain(nameOrDomain);
    super.registerProvider(domain, provider);
    this.reconnect(domain);
  }

  registerSigner(nameOrDomain: string | number, signer: ethers.Signer) {
    const domain = this.resolveDomain(nameOrDomain);
    super.registerSigner(domain, signer);
    this.reconnect(domain);
  }

  unregisterSigner(nameOrDomain: string | number): void {
    const domain = this.resolveDomain(nameOrDomain);
    super.unregisterSigner(domain);
    this.reconnect(domain);
  }

  getCore(nameOrDomain: string | number): CoreContracts | undefined {
    const domain = this.resolveDomain(nameOrDomain);
    return this.cores.get(domain);
  }

  mustGetCore(nameOrDomain: string | number): CoreContracts {
    const core = this.getCore(nameOrDomain);
    if (!core) {
      throw new Error(`Missing core for domain: ${nameOrDomain}`);
    }
    return core;
  }

  getBridge(nameOrDomain: string | number): BridgeContracts | undefined {
    const domain = this.resolveDomain(nameOrDomain);
    return this.bridges.get(domain);
  }

  mustGetBridge(nameOrDomain: string | number): BridgeContracts {
    const bridge = this.getBridge(nameOrDomain);
    if (!bridge) {
      throw new Error(`Missing bridge for domain: ${nameOrDomain}`);
    }
    return bridge;
  }

  // gets the replica of Home on Remote
  getReplicaFor(
    home: string | number,
    remote: string | number,
  ): core.Replica | undefined {
    return this.getCore(remote)?.replicas.get(this.resolveDomain(home))
      ?.contract;
  }

  mustGetReplicaFor(
    home: string | number,
    remote: string | number,
  ): core.Replica {
    const replica = this.getReplicaFor(home, remote);
    if (!replica) {
      throw new Error(`Missing replica for home ${home} & remote ${remote}`);
    }
    return replica;
  }

  // resolve the local repr of a token on its domain
  async resolveTokenRepresentation(
    nameOrDomain: string | number,
    token: TokenIdentifier,
  ): Promise<xapps.BridgeToken | undefined> {
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

    let contract = new xapps.BridgeToken__factory().attach(address);

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
    const tokens: Map<number, xapps.BridgeToken> = new Map();

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
    const bridge = this.mustGetBridge(nameOrDomain);

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
    overrides: ethers.Overrides = {},
  ): Promise<TransferMessage> {
    const fromBridge = this.mustGetBridge(from);
    const bridgeAddress = fromBridge.bridgeRouter.address;

    const fromToken = await this.resolveTokenRepresentation(from, token);
    if (!fromToken) {
      throw new Error(`Token not available on ${from}`);
    }
    const sender = this.getSigner(from);
    if (!sender) {
      throw new Error(`No signer for ${from}`);
    }
    const senderAddress = await sender.getAddress();

    const approved = await fromToken.allowance(senderAddress, bridgeAddress);
    // Approve if necessary
    if (approved.lt(amount)) {
      await fromToken.approve(bridgeAddress, amount, overrides);
    }

    const tx = await fromBridge.bridgeRouter.send(
      fromToken.address,
      amount,
      this.resolveDomain(to),
      canonizeId(recipient),
      overrides,
    );
    const receipt = await tx.wait();

    const message = TransferMessage.singleFromReceipt(this, from, receipt);
    if (!message) {
      throw new Error();
    }

    return message as TransferMessage;
  }

  async sendNative(
    from: string | number,
    to: string | number,
    amount: BigNumberish,
    recipient: Address,
    overrides: ethers.PayableOverrides = {},
  ): Promise<TransferMessage> {
    const ethHelper = this.mustGetBridge(from).ethHelper;
    if (!ethHelper) {
      throw new Error(`No ethHelper for ${from}`);
    }

    const toDomain = this.resolveDomain(to);

    overrides.value = amount;

    const tx = await ethHelper.sendToEVMLike(toDomain, recipient, overrides);
    const receipt = await tx.wait();

    const message = TransferMessage.singleFromReceipt(this, from, receipt);
    if (!message) {
      throw new Error();
    }

    return message as TransferMessage;
  }
}

export const mainnet = OpticsContext.fromDomains(mainnetDomains);
export const dev = OpticsContext.fromDomains(devDomains);
export const staging = OpticsContext.fromDomains(stagingDomains);

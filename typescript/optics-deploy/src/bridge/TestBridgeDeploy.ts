import { BytesLike, ethers, Signer } from 'ethers';
import {
  UpgradeBeaconController,
  UpgradeBeaconController__factory,
} from '../../../typechain/optics-core';
import {
  BridgeRouter,
  IERC20,
  IERC20__factory,
  MockCore,
  MockCore__factory,
} from '../../../typechain/optics-xapps';
import { ContractVerificationInput } from '../deploy';
import { BridgeContracts } from './BridgeContracts';
import * as process from '.';

function toBytes32(address: string): string {
  return '0x' + '00'.repeat(12) + address.slice(2);
}

// A BridgeRouter deployed with a mock Core suite.
//
// Intended usage: instatiate in hardhat tests with `deploy`. Interact with
// the Bridge contracts as normal. Dispatch messages to the bridge using
// router's `handle` function. The test signer is pre-authorized. Messages the
// router dispatches will be logged in the `Enqueue` event on the `MockCore`
// contract.
export default class TestBridgeDeploy {
  signer: Signer;
  ubc: UpgradeBeaconController;
  mockCore: MockCore;
  contracts: BridgeContracts;
  verificationInput: ContractVerificationInput[];
  localDomain: number;

  constructor(
    signer: Signer,
    mockCore: MockCore,
    ubc: UpgradeBeaconController,
    contracts: BridgeContracts,
    domain: number,
    callerKnowsWhatTheyAreDoing: boolean = false,
  ) {
    if (!callerKnowsWhatTheyAreDoing) {
      throw new Error("Don't instantiate via new.");
    }
    this.verificationInput = [];
    this.ubc = ubc;
    this.mockCore = mockCore;
    this.contracts = contracts;
    this.signer = signer;
    this.localDomain = domain;
  }

  static async deploy(signer: Signer): Promise<TestBridgeDeploy> {
    const mockCore = await new MockCore__factory(signer).deploy();
    const ubc = await new UpgradeBeaconController__factory(signer).deploy();
    const contracts = new BridgeContracts();
    const domain = await mockCore.localDomain();

    let deploy = new TestBridgeDeploy(
      signer,
      mockCore,
      ubc,
      contracts,
      domain,
      true,
    );

    await process.deployTokenUpgradeBeacon(deploy);
    await process.deployBridgeRouter(deploy);
    await process.deployEthHelper(deploy);

    // enroll the signer as a remote BridgeRouter
    // so the test BridgeRouter will accept messages
    // directly from the signer
    await contracts.bridgeRouter?.proxy.enrollRemoteRouter(
      1,
      toBytes32(await signer.getAddress()),
    );

    return deploy;
  }

  get ubcAddress(): string {
    return this.ubc.address;
  }

  get deployer(): Signer {
    return this.chain.deployer;
  }

  get coreContractAddresses() {
    return {
      xAppConnectionManager: this.mockCore.address,
      home: { proxy: this.mockCore.address },
      governance: { proxy: this.mockCore.address },
    };
  }

  get chain() {
    return { name: 'test', confirmations: 0, deployer: this.signer };
  }
  get coreDeployPath() {
    return '';
  }
  get overrides() {
    return {};
  }
  get config() {
    return { weth: '' };
  }

  get bridgeRouter(): BridgeRouter | undefined {
    return this.contracts.bridgeRouter?.proxy;
  }

  get remoteDomain(): number {
    return 1;
  }

  get remoteDomainBytes(): string {
    return `0x0000000${this.remoteDomain}`;
  }

  get localDomainBytes(): string {
    return `0x0000000${this.localDomain}`;
  }

  get testToken(): string {
    return `0x${'11'.repeat(32)}`;
  }

  get testTokenId(): string {
    return ethers.utils.hexConcat([this.remoteDomainBytes, this.testToken]);
  }

  async getTestRepresentation(): Promise<IERC20 | undefined> {
    return await this.getRepresentation(this.remoteDomain, this.testToken);
  }

  async getRepresentation(
    domain: number,
    canonicalTokenAddress: BytesLike,
  ): Promise<IERC20 | undefined> {
    const reprAddr = await this.bridgeRouter![
      'getLocalAddress(uint32,bytes32)'
    ](domain, canonicalTokenAddress);

    if (domain === 0) {
      return undefined;
    }

    return IERC20__factory.connect(reprAddr, this.signer);
  }
}

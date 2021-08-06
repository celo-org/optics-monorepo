import { Signer } from 'ethers';
import {
  UpgradeBeaconController,
  UpgradeBeaconController__factory,
} from '../../../typechain/optics-core';
import { MockCore, MockCore__factory } from '../../../typechain/optics-xapps';
import { ContractVerificationInput } from '../deploy';
import { BridgeContracts } from './BridgeContracts';
import * as process from '.';

function toBytes32(address: string): string {
  return '0x' + '00'.repeat(12) + address.slice(2);
}

export default class TestBridgeDeploy {
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

  signer: Signer;
  ubc: UpgradeBeaconController;
  mockCore: MockCore;
  contracts: BridgeContracts;
  verificationInput: ContractVerificationInput[];

  constructor(
    signer: Signer,
    mockCore: MockCore,
    ubc: UpgradeBeaconController,
    contracts: BridgeContracts,
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
  }

  static async deploy(signer: Signer): Promise<TestBridgeDeploy> {
    const mockCore = await new MockCore__factory(signer).deploy();
    const ubc = await new UpgradeBeaconController__factory(signer).deploy();
    const contracts = new BridgeContracts();

    let deploy = new TestBridgeDeploy(signer, mockCore, ubc, contracts, true);

    await process.deployTokenUpgradeBeacon(deploy);
    await process.deployBridgeRouter(deploy);
    await process.deployEthHelper(deploy);

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
      xappConnectionManager: this.mockCore.address,
      home: { proxy: this.mockCore.address },
      governance: { proxy: this.mockCore.address },
    };
  }
}

import { expect } from 'chai';

import { assertBeaconProxy } from '../core/checks';
import { BridgeDeploy as Deploy } from './BridgeDeploy';
import TestBridgeDeploy from './TestBridgeDeploy';

const emptyAddr = '0x' + '00'.repeat(32);

export async function checkBridgeDeploy(
  deploy: Deploy | TestBridgeDeploy,
  remotes: number[],
) {
  assertBeaconProxy(deploy.contracts.bridgeToken!);
  assertBeaconProxy(deploy.contracts.bridgeRouter!);

  if (deploy.config.weth) {
    expect(deploy.contracts.ethHelper).to.not.be.undefined;
  } else {
    expect(deploy.contracts.ethHelper).to.be.undefined;
  }

  const bridgeRouter = deploy.contracts.bridgeRouter?.proxy!;
  await Promise.all(remotes.map(async (remoteDomain) => {
    const registeredRouter = await bridgeRouter.remotes(remoteDomain);
    expect(registeredRouter).to.not.equal(emptyAddr);
  }))

  expect(await bridgeRouter.owner()).to.equal(deploy.coreContractAddresses.governance.proxy);

  expect(deploy.verificationInput[0].address).to.equal(deploy.contracts.bridgeToken?.implementation.address);
  expect(deploy.verificationInput[1].address).to.equal(deploy.contracts.bridgeToken?.beacon.address);
  expect(deploy.verificationInput[2].address).to.equal(deploy.contracts.bridgeToken?.proxy.address);
  expect(deploy.verificationInput[3].address).to.equal(deploy.contracts.bridgeRouter?.implementation.address);
  expect(deploy.verificationInput[4].address).to.equal(deploy.contracts.bridgeRouter?.beacon.address);
  expect(deploy.verificationInput[5].address).to.equal(deploy.contracts.bridgeRouter?.proxy.address);
  if (deploy.config.weth) {
    expect(deploy.verificationInput[6].address).to.equal(deploy.contracts.ethHelper?.address);
  }
}

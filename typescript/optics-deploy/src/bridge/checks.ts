import { expect } from 'chai';

import { assertBeaconProxy } from '../core/checks';
import { BridgeDeploy as Deploy } from './BridgeDeploy';
import TestBridgeDeploy from './TestBridgeDeploy';
import { checkVerificationInput } from '../core/checks';

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
  await Promise.all(
    remotes.map(async (remoteDomain) => {
      const registeredRouter = await bridgeRouter.remotes(remoteDomain);
      expect(registeredRouter).to.not.equal(emptyAddr);
    }),
  );

  expect(await bridgeRouter.owner()).to.equal(
    deploy.coreContractAddresses.governance.proxy,
  );

  // check verification addresses
  checkVerificationInput(
    deploy,
    'BridgeToken Implementation',
    deploy.contracts.bridgeToken?.implementation.address!,
  );
  checkVerificationInput(
    deploy,
    'BridgeToken UpgradeBeacon',
    deploy.contracts.bridgeToken?.beacon.address!,
  );
  checkVerificationInput(
    deploy,
    'BridgeToken Proxy',
    deploy.contracts.bridgeToken?.proxy.address!,
  );
  checkVerificationInput(
    deploy,
    'BridgeRouter Implementation',
    deploy.contracts.bridgeRouter?.implementation.address!,
  );
  checkVerificationInput(
    deploy,
    'BridgeRouter UpgradeBeacon',
    deploy.contracts.bridgeRouter?.beacon.address!,
  );
  checkVerificationInput(
    deploy,
    'BridgeRouter Proxy',
    deploy.contracts.bridgeRouter?.proxy.address!,
  );
  if (deploy.config.weth) {
    expect(deploy.verificationInput[6].address).to.equal(
      deploy.contracts.ethHelper?.address,
    );
  }
}

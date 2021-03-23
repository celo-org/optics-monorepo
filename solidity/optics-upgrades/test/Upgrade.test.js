// const { ethers } = require('hardhat');
// const { expect } = require('chai');
//
// describe('Upgrade', async () => {
//   let proxy, upgradeBeacon, controller, implementation1, implementation2;
//   const a = 5;
//   const b = 10;
//   const stateVar = 17;
//   controller = {
//     address: '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8',
//   };
//
//   before(async () => {
//     console.log('ETHERS: ', JSON.stringify(ethers, null, 2));
//     //SETUP CONTRACT SUITE
//
//     // Deploy Implementation 1
//     const MysteryMathV1 = await ethers.getContractFactory('MysteryMathV1');
//     implementation1 = await MysteryMathV1.deploy();
//     await implementation1.deployed();
//
//     // Deploy Implementation 2
//     const MysteryMathV2 = await ethers.getContractFactory('MysteryMathV2');
//     implementation2 = await MysteryMathV2.deploy();
//     await implementation2.deployed();
//
//     //#later Deploy Controller
//
//     //Deploy UpgradeBeacon
//     const UpgradeBeacon = await ethers.getContractFactory('UpgradeBeacon');
//     upgradeBeacon = await UpgradeBeacon.deploy(
//       controller.address,
//       implementation1.address,
//     );
//     await upgradeBeacon.deployed();
//
//     //Deploy Proxy (upgradeBeacon = UpgradeBeacon)
//     const upgradeBeaconAddress = upgradeBeacon.address;
//     const initCallData = '';
//     const Proxy = await ethers.getContractFactory('UpgradeBeaconProxy');
//     proxy = await Proxy.deploy(upgradeBeaconAddress, initCallData);
//     await proxy.deployed();
//
//     //Set state of proxy
//     await proxy.setState(stateVar);
//   });
//
//   it('Pre-Upgrade returns version 1', async () => {
//     const versionResult = await proxy.version();
//     expect(versionResult).to.equal(1);
//   });
//
//   it('Pre-Upgrade returns the math from implementation v1', async () => {
//     const mathResult = await proxy.doMath(a, b);
//     expect(mathResult).to.equal(a + b);
//   });
//
//   it('Pre-Upgrade returns the expected state variable', async () => {
//     const stateResult = await proxy.getState();
//     expect(stateResult).to.equal(stateVar);
//   });
//
//   it('Upgrades without problem', async () => {
//     await upgradeBeacon.upgradeTo(implementation2.address);
//   });
//
//   it('Post-Upgrade returns version 2', async () => {
//     const versionResult = await proxy.version();
//     expect(versionResult).to.equal(2);
//   });
//
//   it('Post-Upgrade returns the math from implementation v2', async () => {
//     const mathResult = await proxy.doMath(a, b);
//     expect(mathResult).to.equal(a * b);
//   });
//
//   it('Post-Upgrade preserved the state variable', async () => {
//     const stateResult = await proxy.getState();
//     expect(stateResult).to.equal(stateVar);
//   });
// });

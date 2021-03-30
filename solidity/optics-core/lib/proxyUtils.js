async function deployProxyWithImplementation(
  implementationName,
  deployArgs = [],
  initializeArgs = [],
  initializeIdentifier = 'initialize',
) {
  // #later Deploy Controller
  const signerArray = await ethers.getSigners();
  const signer = signerArray[0];
  const controller = {
    address: signer.address,
  };

  const Implementation = await ethers.getContractFactory(implementationName);
  const implementation = await Implementation.deploy(...deployArgs);
  await implementation.deployed();

  // Deploy UpgradeBeacon
  const UpgradeBeacon = await ethers.getContractFactory('UpgradeBeacon');
  const upgradeBeacon = await UpgradeBeacon.deploy(
    implementation.address,
    controller.address,
  );
  await upgradeBeacon.deployed();

  let initializeData;
  if (initializeArgs.length === 0) {
    initializeData = '0x';
  } else {
    const initializeFunction = Implementation.interface.getFunction(
      initializeIdentifier,
    );
    initializeData = Implementation.interface.encodeFunctionData(
      initializeFunction,
      initializeArgs,
    );
  }

  // Deploy Proxy Contract (upgradeBeacon = UpgradeBeacon)
  const Proxy = await ethers.getContractFactory('UpgradeBeaconProxy');
  const proxy = await Proxy.deploy(upgradeBeacon.address, initializeData);
  await proxy.deployed();

  // instantiate proxy with Proxy Contract address + Implementation interface
  const proxyWithImplementation = new ethers.Contract(
    proxy.address,
    Implementation.interface,
    signer,
  );

  return {
    contracts: {
      implementation,
      controller,
      upgradeBeacon,
      proxy,
      proxyWithImplementation,
    },
  };
}

async function upgradeToImplementation(
  upgradeBeacon,
  controller,
  newImplementationName,
) {
  const NewImplementation = await ethers.getContractFactory(
    newImplementationName,
  );
  const newImplementation = await NewImplementation.deploy();
  await newImplementation.deployed();

  const upgradeTransaction = {
    to: upgradeBeacon.address,
    data: ethers.utils.hexZeroPad(newImplementation.address, 32),
  };

  await controller.sendTransaction(upgradeTransaction);
}

module.exports = {
  deployProxyWithImplementation,
  upgradeToImplementation,
};

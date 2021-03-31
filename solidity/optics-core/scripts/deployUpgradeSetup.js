async function deployImplementation(implementationName, deployArgs = []) {
  const Implementation = await ethers.getContractFactory(implementationName);
  const implementation = await Implementation.deploy(...deployArgs);
  return implementation.deployed();
}

async function deployUpgradeBeaconController() {
  const UpgradeBeaconController = await ethers.getContractFactory(
    'UpgradeBeaconController',
  );
  const upgradeBeaconController = await UpgradeBeaconController.deploy();
  return upgradeBeaconController.deployed();
}

async function deployUpgradeBeacon(
  implementationAddress,
  upgradeBeaconControllerAddress,
) {
  const UpgradeBeacon = await ethers.getContractFactory('UpgradeBeacon');
  const upgradeBeacon = await UpgradeBeacon.deploy(
    implementationAddress,
    upgradeBeaconControllerAddress,
  );
  return upgradeBeacon.deployed();
}

async function deployProxy(upgradeBeaconAddress, initializeData = '0x') {
  const Proxy = await ethers.getContractFactory('UpgradeBeaconProxy');
  const proxy = await Proxy.deploy(upgradeBeaconAddress, initializeData);
  return proxy.deployed();
}

async function deployProxyWithImplementation(
  upgradeBeaconAddress,
  implementationName,
  initializeArgs = [],
  initializeIdentifier = 'initialize',
) {
  const Implementation = await ethers.getContractFactory(implementationName);

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

  const proxy = await deployProxy(upgradeBeaconAddress, initializeData);

  // instantiate proxy with Proxy Contract address + Implementation interface
  const signerArray = await ethers.getSigners();
  const signer = signerArray[0];
  const proxyWithImplementation = new ethers.Contract(
    proxy.address,
    Implementation.interface,
    signer,
  );
  return { proxy, proxyWithImplementation };
}

async function deployUpgradeSetupWithImplementation(
  implementationName,
  implementationDeployArgs = [],
  proxyInitializeArgs = [],
  implementationInitializeFunctionIdentifier = 'initialize',
) {
  // Deploy Implementation
  const implementation = await deployImplementation(
    implementationName,
    implementationDeployArgs,
  );

  // Deploy UpgradeBeaconController
  const upgradeBeaconController = await deployUpgradeBeaconController();

  // Deploy UpgradeBeacon
  const upgradeBeacon = await deployUpgradeBeacon(
    implementation.address,
    upgradeBeaconController.address,
  );

  // Construct initialize data
  // Deploy Proxy Contract and initialize
  const {
    proxy,
    proxyWithImplementation,
  } = await deployProxyWithImplementation(
    upgradeBeacon.address,
    implementationName,
    proxyInitializeArgs,
    implementationInitializeFunctionIdentifier,
  );

  return {
    contracts: {
      implementation,
      upgradeBeaconController,
      upgradeBeacon,
      proxy,
      proxyWithImplementation,
    },
  };
}

module.exports = {
  deployUpgradeSetupWithImplementation,
  deployImplementation,
  deployUpgradeBeaconController,
  deployUpgradeBeacon,
  deployProxy,
  deployProxyWithImplementation,
};

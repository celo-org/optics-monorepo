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
  const [signer] = await ethers.getSigners();
  const proxyWithImplementation = new ethers.Contract(
    proxy.address,
    Implementation.interface,
    signer,
  );
  return { proxy, proxyWithImplementation };
}

async function deployUpgradeSetup(
  implementationName,
  implementationDeployArgs,
  upgradeBeaconController,
) {
  // Deploy Implementation
  const implementation = await deployImplementation(
    implementationName,
    implementationDeployArgs,
  );

  // Deploy UpgradeBeacon
  const upgradeBeacon = await deployUpgradeBeacon(
    implementation.address,
    upgradeBeaconController.address,
  );

  return { implementation, upgradeBeaconController, upgradeBeacon };
}

async function deployUpgradeSetupAndController(
  implementationName,
  implementationDeployArgs,
) {
  // Deploy UpgradeBeaconController
  const upgradeBeaconController = await deployUpgradeBeaconController();

  return deployUpgradeSetup(
    implementationName,
    implementationDeployArgs,
    upgradeBeaconController,
  );
}

async function deployUpgradeSetupAndProxy(
  implementationName,
  implementationDeployArgs = [],
  proxyInitializeArgs = [],
  upgradeBeaconController,
  implementationInitializeFunctionIdentifier = 'initialize',
) {
  let upgradeSetup;
  if (upgradeBeaconController) {
    upgradeSetup = await deployUpgradeSetup(
      implementationName,
      implementationDeployArgs,
      upgradeBeaconController,
    );
  } else {
    upgradeSetup = await deployUpgradeSetupAndController(
      implementationName,
      implementationDeployArgs,
    );
    upgradeBeaconController = upgradeSetup.upgradeBeaconController;
  }

  const { implementation, upgradeBeacon } = upgradeSetup;

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
  deployUpgradeBeaconController,
  deployUpgradeSetup,
  deployImplementation,
  deployUpgradeBeacon,
  deployUpgradeSetupAndProxy,
  deployProxy,
  deployProxyWithImplementation,
};

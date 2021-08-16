import '@nomiclabs/hardhat-waffle';
import { extendEnvironment } from 'hardhat/config';

import { optics } from './core';

import { bridge } from './bridge';

// HardhatRuntimeEnvironment
extendEnvironment((hre) => {
  hre.optics = optics;
  hre.bridge = bridge;
});

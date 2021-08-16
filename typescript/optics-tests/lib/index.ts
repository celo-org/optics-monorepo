import '@nomiclabs/hardhat-waffle';
import { extendEnvironment } from 'hardhat/config';

import { optics } from './core';

import {
  BridgeMessageTypes,
  typeToBytes
} from './bridge';

// HardhatRuntimeEnvironment
extendEnvironment((hre) => {
  hre.optics = optics;
  hre.bridge = {
    BridgeMessageTypes,
    typeToBytes
  }
});

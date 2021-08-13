import '@nomiclabs/hardhat-waffle';
import { extendEnvironment } from 'hardhat/config';

import {
  formatMessage,
  formatTransferGovernor,
  formatSetRouter,
  formatCalls,
  messageToLeaf,
  ethersAddressToBytes32,
  destinationAndSequence,
  domainHash,
  signedFailureNotification
} from './core';
import {
  BridgeMessageTypes,
  typeToBytes
} from './bridge';

// HardhatRuntimeEnvironment
extendEnvironment((hre) => {
  hre.optics = {
    formatMessage,
    governance: {
      formatTransferGovernor,
      formatSetRouter,
      formatCalls,
    },
    messageToLeaf,
    ethersAddressToBytes32,
    destinationAndSequence,
    domainHash,
    signedFailureNotification,
  };
  hre.bridge = {
    BridgeMessageTypes,
    typeToBytes
  }
});

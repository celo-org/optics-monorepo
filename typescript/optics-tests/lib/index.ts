import '@nomiclabs/hardhat-waffle';
import { extendEnvironment } from 'hardhat/config';

// import * as coreUtils from './core';
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
});

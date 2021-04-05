// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "../UpdaterManager.sol";

contract TestUpdaterManager is UpdaterManager {
    constructor(address _updater) payable UpdaterManager(_updater) {}
}

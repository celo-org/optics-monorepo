// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

interface UpdaterManagerI {
    function updater() external view returns (address);

    function slashUpdater(address payable _reporter) external;
}

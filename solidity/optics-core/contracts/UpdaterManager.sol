// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "../interfaces/UpdaterManagerI.sol";

import "./Home.sol";

contract UpdaterManager is UpdaterManagerI, Ownable {
    address internal updater;
    address internal home;

    /// @notice Event emitted when the updater is slashed
    event Slashed();

    /**
     * @notice Event emitted when a new home is set
     * @param home The address of the new home
     */
    event NewHome(address home);

    constructor(address _updater) payable Ownable() {
        updater = _updater;
    }

    /**
     * @notice Permissioned function that sets the address of the new home contract
     * @param _home The address of the new home contract
     */
    function setHome(address _home) external onlyOwner {
        require(Address.isContract(_home), "!home");
        home = _home;

        emit NewHome(_home);
    }

    /**
     * @notice Permissioned function that sets the address of the new updater contract
     * @param _updater The address of the new updater contract
     */
    function setUpdater(address _updater) external onlyOwner {
        updater = _updater;
        Home homeContract = Home(home);
        homeContract.setUpdater(_updater);
    }

    /// @notice Returns the address of the current updater
    function current() external view override returns (address) {
        return updater;
    }

    /**
     * @notice Slashes the updater
     * @dev Currently only emits Slashed event, functionality will come later
     * @param _reporter The address of the entity that reported the updater fraud
     */
    // solhint-disable-next-line no-unused-vars
    function slash(address payable _reporter) external override {
        require(msg.sender == home, "!home");
        emit Slashed();
    }
}

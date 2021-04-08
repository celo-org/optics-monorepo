// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "../interfaces/UpdaterManagerI.sol";
import "./Home.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract UpdaterManager is UpdaterManagerI, Ownable {
    address private _updater;
    address internal home;

    /**
     * @notice Event emitted when a new home is set
     * @param home The address of the new home contract
     */
    event NewHome(address home);

    constructor(address _updaterAddress) payable Ownable() {
        _updater = _updaterAddress;
    }

    modifier onlyHome() {
        require(msg.sender == home, "!home");
        _;
    }

    /**
     * @notice Permissioned function that sets the address of the new home contract
     * @param _home The address of the new home contract
     */
    function setHome(address _home) external onlyOwner {
        require(Address.isContract(_home), "!contract home");
        home = _home;

        emit NewHome(_home);
    }

    /**
     * @notice Permissioned function that sets the address of the new updater contract
     * @param _updaterAddress The address of the new updater contract
     */
    function setUpdater(address _updaterAddress) external onlyOwner {
        _updater = _updaterAddress;
        Home homeContract = Home(home);
        homeContract.setUpdater(_updaterAddress);
    }

    /// @notice Returns the address of the current updater
    function updater() external view override returns (address) {
        return _updater;
    }

    /**
     * @notice Slashes the updater
     * @dev Currently only emits Slashed event, functionality will come later
     * @param _reporter The address of the entity that reported the updater fraud
     */
    // solhint-disable-next-line no-unused-vars
    function slashUpdater(address payable _reporter)
        external
        override
        onlyHome
    {} // solhint-disable-line no-empty-blocks
}

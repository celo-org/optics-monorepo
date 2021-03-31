// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./UpgradeBeacon.sol";

/**
 * @title UpgradeBeaconController
 *
 * @notice
 * This contract is capable of deploying UpgradeBeacon contracts which it controls
 * and changing the Implementation stored at an UpgradeBeacon which it controls
 *
 * This implementation is a minimal version inspired by 0age's implementation:
 * https://github.com/dharma-eng/dharma-smart-wallet/blob/master/contracts/upgradeability/DharmaUpgradeBeaconController.sol
 */
contract UpgradeBeaconController is Ownable {
    event BeaconDeployed(address beacon, address implementation);
    event BeaconUpgraded(address indexed beacon, address implementation);

    /**
     * @notice Deploy the Controller and the initial set of UpgradeBeacon
     * contracts using this Controller, each with their own initial Implementations
     *
     * @param _implementations - Array of addresses of Implementation contracts
     * for which we want to deploy an UpgradeBeacon with that Implementation
     */
    constructor(address[] memory _implementations) {
        for (uint256 i = 0; i < _implementations.length; i++) {
            _deployUpgradeBeacon(_implementations[i]);
        }
    }

    /**
     * @notice Deploy a new UpgradeBeacon contract using this as the Controller
     * with the initial implementation provided
     *
     * @param _implementation - Address of the initial Implementation for the new Beacon
     */
    function deployUpgradeBeacon(address _implementation) public onlyOwner {
        _deployUpgradeBeacon(_implementation);
    }

    /**
     * @notice Modify the Implementation stored in the UpgradeBeacon,
     * which will upgrade the Implementation of all Proxy contracts
     * pointing to the UpgradeBeacon
     *
     * @param _beacon - Address of the UpgradeBeacon which will be updated
     * @param _implementation - Address of the Implementation contract to upgrade the Beacon to
     */
    function upgrade(address _beacon, address _implementation)
        public
        onlyOwner
    {
        // Require that the beacon is a contract
        require(Address.isContract(_beacon), "beacon !contract");

        // Call into beacon and supply address of new implementation to update it.
        (bool success, ) = _beacon.call(abi.encode(_implementation));

        // Revert with message on failure (i.e. if the beacon is somehow incorrect).
        if (!success) {
            assembly {
                returndatacopy(0, 0, returndatasize())
                revert(0, returndatasize())
            }
        }

        emit BeaconUpgraded(_beacon, _implementation);
    }

    /**
     * @notice Deploy a new UpgradeBeacon contract using this as the Controller
     * with the initial implementation provided
     *
     * @param _implementation - Address of the initial Implementation for the new Beacon
     */
    function _deployUpgradeBeacon(address _implementation) private {
        // Deploy the beacon with this as the controller
        UpgradeBeacon _beacon =
            new UpgradeBeacon(_implementation, address(this));

        emit BeaconDeployed(address(_beacon), _implementation);
    }
}

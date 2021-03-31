// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./UpgradeBeacon.sol";

/**
 * @title UpgradeBeaconController
 *
 * @notice
 * This contract is capable of changing the Implementation address
 * stored at any UpgradeBeacon which it controls
 *
 * This implementation is a minimal version inspired by 0age's implementation:
 * https://github.com/dharma-eng/dharma-smart-wallet/blob/master/contracts/upgradeability/DharmaUpgradeBeaconController.sol
 */
contract UpgradeBeaconController is Ownable {
    event BeaconUpgraded(address indexed beacon, address implementation);

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
}

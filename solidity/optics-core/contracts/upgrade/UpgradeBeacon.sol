// SPDX-License-Identifier: MIT
pragma solidity >=0.6.11;

// ============ External Imports ============
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title UpgradeBeacon
 *
 * @notice
 * This contract stores the address of an implementation contract
 * and allows the controller to change the implementation address
 *
 * This implementation combines the gas savings of having no function selectors
 * found in 0age's implementation:
 * https://github.com/dharma-eng/dharma-smart-wallet/blob/master/contracts/proxies/smart-wallet/UpgradeBeaconProxyV1.sol
 * With the added niceties of a safety check that each implementation is a contract
 * and an Upgrade event emitted each time the implementation is changed
 * found in OpenZeppelin's implementation:
 * https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/proxy/beacon/BeaconProxy.sol
 */
contract UpgradeBeacon {
    // The implementation address is held in storage slot zero.
    address private implementation;
    // The controller is capable of modifying the implementation address
    address private immutable controller;

    // Upgrade event is emitted each time the implementation address is set
    // (including deployment)
    event Upgrade(address indexed implementation);

    /**
     * @notice Validate that the initial implementation is a contract,
     * then store it in the contract.
     * Validate that the controller is also a contract,
     * Then store it immutably in this contract.
     *
     * @param _initialImplementation - Address of the initial implementation contract
     * @param _controller - Address of the controller to be stored immutably in the contract
     */
    constructor(address _initialImplementation, address _controller) payable {
        _setImplementation(_initialImplementation);

        controller = _controller;
    }

    /**
     * @notice In the fallback function, allow only the controller to update the
     * implementation address - for all other callers, return the current address.
     * Note that this requires inline assembly, as Solidity fallback functions do
     * not natively take arguments or return values.
     */
    fallback() external payable {
        // Return implementation address for all callers other than the controller.
        if (msg.sender != controller) {
            // Load implementation from storage slot zero into memory and return it.
            assembly {
                mstore(0, sload(0))
                return(0, 32)
            }
        } else {
            // Load new implementation from the first word of the calldata
            address _newImplementation;
            assembly {
                _newImplementation := calldataload(0)
            }

            _setImplementation(_newImplementation);
        }
    }

    /**
     * @notice Perform checks on the new implementation address
     * then upgrade the stored implementation.
     *
     * @param _newImplementation - Address of the new implementation contract which will replace the old one
     */
    function _setImplementation(address _newImplementation) private {
        // Require that the new implementation is different from the current one
        require(implementation != _newImplementation, "!upgrade");

        // Require that the new implementation is a contract
        require(
            Address.isContract(_newImplementation),
            "implementation !contract"
        );

        implementation = _newImplementation;

        emit Upgrade(_newImplementation);
    }
}

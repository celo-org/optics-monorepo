// SPDX-License-Identifier: MIT

pragma solidity >=0.6.11;

/**
 * @title UpgradeBeaconProxyV1
 * @author 0age
 * @notice This contract delegates all logic, including initialization, to an
 * implementation contract specified by a hard-coded "upgrade beacon" contract.
 * Note that this implementation can be reduced in size by stripping out the
 * metadata hash, or even more significantly by using a minimal upgrade beacon
 * proxy implemented using raw EVM opcodes.
 */

/**

From OpenZeppelin Proxy.sol:
 * @dev This abstract contract provides a fallback function that delegates all calls to another contract using the EVM
 * instruction `delegatecall`. We refer to the second contract as the _implementation_ behind the proxy, and it has to
 * be specified by overriding the virtual {_implementation} function.
 *
 * Additionally, delegation to the implementation can be triggered manually through the {_fallback} function, or to a
 * different contract through the {_delegate} function.
 *
 * The success and return data of the delegated call will be returned back to the caller of the proxy.
 */
contract UpgradeBeaconProxyV1 {
    //TODO: upgrade beacon address should be an immutable constant set at deployment
    // TODO: we should perform the validation checks that OpenZeppelin performs on their Beacon Proxy at deployment
    // Set upgrade beacon address as a constant (i.e. not in contract storage).
    address private immutable upgradeBeacon;

    /**
     * @notice
     * Perform initialization via delegatecall to the
     * implementation set on the upgrade beacon, supplying initialization calldata
     * as a constructor argument. The deployment will revert and pass along the
     * revert reason in the event that this initialization delegatecall reverts.
     * @param _initializationCalldata Calldata to supply when performing the
     * initialization delegatecall.
     */
    constructor(address _upgradeBeacon, bytes memory _initializationCalldata)
        payable
    {
        upgradeBeacon = _upgradeBeacon;

        //TODO: everything below is calling the initialization function on the implementation -- doesn't feel necessary or logically clean
        // Get the current implementation address from the upgrade beacon.
        (bool ok, bytes memory returnData) = _upgradeBeacon.staticcall("");

        // Revert and pass along revert message if call to upgrade beacon reverts.
        require(ok, string(returnData));

        // Set the implementation to the address returned from the upgrade beacon.
        address implementation = abi.decode(returnData, (address));

        // Delegatecall into the implementation, supplying initialization calldata.
        (bool okTwo, ) = implementation.delegatecall(_initializationCalldata);

        // Revert and include revert data if delegatecall to implementation reverts.
        if (!okTwo) {
            assembly {
                returndatacopy(0, 0, returndatasize())
                revert(0, returndatasize())
            }
        }
    }

    /**
     * @dev Runs calls with data - no other public functions are declared on the contract, so fallback is always hit
     */
    fallback() external payable {
        _fallback();
    }

    /**
     * @dev Runs for calls with no data
     */
    receive() external payable {
        _fallback();
    }

    /**
     * @dev Delegates calls to the implementation returned by the Upgrade Beacon
     */
    function _fallback() internal {
        _delegate(_implementation());
    }

    /**

     TODO: documentation
     * @notice Private view function to get the current implementation from the
     * upgrade beacon. This is accomplished via a staticcall to the beacon with no
     * data, and the beacon will return an abi-encoded implementation address.
     * @return implementation Address of the implementation.
     */
    function _implementation() private view returns (address implementation) {
        //TODO: update how we get _UPGRADE_BEACON address if we are setting it at deployment
        // Get the current implementation address from the upgrade beacon.
        (bool ok, bytes memory returnData) = upgradeBeacon.staticcall(""); //TODO: at upgrade beacon we are calling with no data because there is only one fallback function that behaves differently for admin vs. caller

        // Revert and pass along revert message if call to upgrade beacon reverts.
        require(ok, string(returnData));

        // Set the implementation to the address returned from the upgrade beacon.
        implementation = abi.decode(returnData, (address));
    }

    /**
     * @notice

     TODO: documentation
     Private function that delegates execution to an implementation
     * contract. This is a low level function that doesn't return to its internal
     * call site. It will return whatever is returned by the implementation to the
     * external caller, reverting and returning the revert data if implementation
     * reverts.
     * @param implementation Address to delegate.
     */
    function _delegate(address implementation) private {
        assembly {
            // Copy msg.data. We take full control of memory in this inline assembly
            // block because it will not return to Solidity code. We overwrite the
            // Solidity scratch pad at memory position 0.
            calldatacopy(0, 0, calldatasize())

            // Delegatecall to the implementation, supplying calldata and gas.
            // Out and outsize are set to zero - instead, use the return buffer.
            let result := delegatecall(
                gas(),
                implementation,
                0,
                calldatasize(),
                0,
                0
            )

            // Copy the returned data from the return buffer.
            returndatacopy(0, 0, returndatasize())

            switch result
                // Delegatecall returns 0 on error.
                case 0 {
                    revert(0, returndatasize())
                }
                default {
                    return(0, returndatasize())
                }
        }
    }
}

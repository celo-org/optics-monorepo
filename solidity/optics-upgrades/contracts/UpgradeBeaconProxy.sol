// SPDX-License-Identifier: MIT

pragma solidity >=0.6.11;

import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title UpgradeBeaconProxy
 *
 * @notice
 * This contract delegates all logic, including initialization, to an implementation contract.
 * The implementation contract is stored within the Upgrade Beacon contract;
 * the implementation contract can be changed by performing an upgrade on the Upgrade Beacon contract.
 * The Upgrade Beacon contract for this Proxy is immutably specified at deployment.
 *
 * This implementation combines the gas savings of keeping the UpgradeBeacon address outside of contract storage
 * found in 0age's implementation:
 * https://github.com/dharma-eng/dharma-smart-wallet/blob/master/contracts/proxies/smart-wallet/UpgradeBeaconProxyV1.sol
 * With the added safety checks that the UpgradeBeacon and implementation are contracts at time of deployment
 * found in OpenZeppelin's implementation:
 * https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/proxy/beacon/BeaconProxy.sol
 */
contract UpgradeBeaconProxy {
    // Upgrade Beacon address is immutable (therefore not kept in contract storage)
    address private immutable upgradeBeacon;

    /**
     * @notice Validate that the Upgrade Beacon is a contract, then set its
     * address immutably within this contract.
     * Validate that the implementation is also a contract,
     * Then call the initialization function defined at the implementation.
     * The deployment will revert and pass along the
     * revert reason if the initialization function reverts.
     *
     * @param _upgradeBeacon - Address of the Upgrade Beacon to be stored immutably in the contract
     * @param _initializationCalldata - Calldata supplied when calling the initialization function
     */
    constructor(address _upgradeBeacon, bytes memory _initializationCalldata)
        payable
    {
        // Validate the Upgrade Beacon is a contract
        require(Address.isContract(_upgradeBeacon), "beacon !contract");

        // set the Upgrade Beacon
        upgradeBeacon = _upgradeBeacon;

        // Validate the implementation is a contract
        address implementation = _implementation(_upgradeBeacon);

        require(
            Address.isContract(implementation),
            "beacon implementation !contract"
        );

        // Call the initialization function on the implementation
        if (_initializationCalldata.length > 0) {
            _initialize(implementation, _initializationCalldata);
        }
    }

    /**
     * @notice Call the initialization function on the implementation
     * Used at deployment to initialize the proxy
     * based on the logic for initialization defined at the implementation
     *
     * @param implementation - Contract to which the initalization is delegated
     * @param _initializationCalldata - Calldata supplied when calling the initialization function
     */
    function _initialize(
        address implementation,
        bytes memory _initializationCalldata
    ) private {
        // Delegatecall into the implementation, supplying initialization calldata.
        (bool ok, ) = implementation.delegatecall(_initializationCalldata);

        // Revert and include revert data if delegatecall to implementation reverts.
        if (!ok) {
            assembly {
                returndatacopy(0, 0, returndatasize())
                revert(0, returndatasize())
            }
        }
    }

    /**
     * @notice Forwards all calls with data to _fallback()
     * No public functions are declared on the contract, so all calls hit fallback
     */
    fallback() external payable {
        _fallback();
    }

    /**
     * @notice Forwards all calls with no data to _fallback()
     */
    receive() external payable {
        _fallback();
    }

    /**
     * @notice Delegates function calls to the implementation contract returned by the Upgrade Beacon
     */
    function _fallback() private {
        _delegate(_implementation());
    }

    /**
     * @notice Call the Upgrade Beacon to get the current implementation contract address
     *
     * @return implementation - Address of the current implementation.
     */
    function _implementation() private view returns (address implementation) {
        implementation = _implementation(upgradeBeacon);
    }

    /**
     * @notice Call the Upgrade Beacon to get the current implementation contract address
     *
     * Note: we pass in the _upgradeBeacon so we can also use this function at
     * deployment, when the upgradeBeacon variable hasn't been set yet.
     *
     * @param _upgradeBeacon - Address of the UpgradeBeacon storing the current implementation
     * @return implementation - Address of the current implementation.
     */
    function _implementation(address _upgradeBeacon)
        private
        view
        returns (address implementation)
    {
        // Get the current implementation address from the upgrade beacon.
        (bool ok, bytes memory returnData) = _upgradeBeacon.staticcall("");

        // Revert and pass along revert message if call to upgrade beacon reverts.
        require(ok, string(returnData));

        // Set the implementation to the address returned from the upgrade beacon.
        implementation = abi.decode(returnData, (address));
    }

    /**
     * @notice Delegate function execution to the implementation contract
     *
     * This is a low level function that doesn't return to its internal
     * call site. It will return whatever is returned by the implementation to the
     * external caller, reverting and returning the revert data if implementation
     * reverts.
     *
     * @param implementation - Address to which the function execution is delegated
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

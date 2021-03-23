// SPDX-License-Identifier: MIT

pragma solidity >=0.6.11;

//TODO: do private functions have the whole function selector thingy gas usage??

contract UpgradeBeacon {
    // The implementation address is held in storage slot zero.
    address private implementation;
    address private immutable controller;

    constructor(address _controller, address _initialImplementation) payable {
        controller = _controller;
        implementation = _initialImplementation;
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
            // Set implementation - put first word in calldata in storage slot zero.
            assembly {
                sstore(0, calldataload(0))
            }
        }
    }

    //TODO: do we need to have a receive here???
    //    receive () external payable {
    //        _fallback();
    //    }
}

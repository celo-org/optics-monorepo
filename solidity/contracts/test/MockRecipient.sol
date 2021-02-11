// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import {OpticsHandlerI} from "../UsingOptics.sol";

contract MockRecipient is OpticsHandlerI {
    constructor() {}

    function handle(
        uint32,
        bytes32,
        bytes memory
    ) external pure override returns (bytes memory) {
        return bytes(message());
    }

    function message() public pure returns (string memory) {
        return "message received";
    }
}

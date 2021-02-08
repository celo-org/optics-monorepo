// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

contract MockRecipient {
    constructor() {}

    function message() public pure returns (string memory) {
        return "message received";
    }
}

// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

contract MockRecipient {
    string public value = "not called";

    constructor() {}
    
    function message() public {
        value = "called";
    }
}
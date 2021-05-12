// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import {IMessageRecipient} from "../../interfaces/IMessageRecipient.sol";

contract TestRecipient is IMessageRecipient {
    fallback() external {
        revert("Fallback");
    }

    function handle(
        uint32,
        bytes32,
        bytes memory
    ) external pure override returns (bytes memory) {
        return bytes(message());
    }

    function receiveString(string calldata _str)
        public
        pure
        returns (string memory)
    {
        return _str;
    }

    function message() public pure returns (string memory) {
        return "message received";
    }
}

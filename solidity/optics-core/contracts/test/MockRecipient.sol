// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import {IMessageRecipient} from "../../interfaces/IMessageRecipient.sol";

contract MockRecipient is IMessageRecipient {
    // solhint-disable-next-line no-empty-blocks
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

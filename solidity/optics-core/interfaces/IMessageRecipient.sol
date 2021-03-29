// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

interface IMessageRecipient {
    function handle(
        uint32 origin,
        bytes32 sender,
        bytes memory message
    ) external returns (bytes memory);
}

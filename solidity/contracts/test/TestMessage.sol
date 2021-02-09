// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "../Common.sol";

contract TestMessage {
    using Message for bytes29;
    using TypedMemView for bytes;
    using TypedMemView for bytes29;

    constructor() {}

    function origin(bytes memory _message) external pure returns (uint32) {
        bytes29 _m = _message.ref(0);
        return _m.origin();
    }

    function sender(bytes memory _message) external pure returns (bytes32) {
        bytes29 _m = _message.ref(0);
        return _m.sender();
    }

    function sequence(bytes memory _message) external pure returns (uint32) {
        bytes29 _m = _message.ref(0);
        return _m.sequence();
    }

    function destination(bytes memory _message) external pure returns (uint32) {
        bytes29 _m = _message.ref(0);
        return _m.destination();
    }

    function recipient(bytes memory _message) external pure returns (bytes32) {
        bytes29 _m = _message.ref(0);
        return _m.recipient();
    }

    function recipientAddress(bytes memory _message)
        external
        pure
        returns (address)
    {
        bytes29 _m = _message.ref(0);
        return _m.recipientAddress();
    }

    function body(bytes memory _message) external view returns (bytes memory) {
        bytes29 _m = _message.ref(0);
        return _m.body().clone();
    }
}

// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "../Replica.sol";

contract TestReplica is ProcessingReplica {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;
    using Message for bytes29;

    constructor(
        uint32 _originSLIP44,
        uint32 _ownSLIP44,
        address _updater,
        uint256 _optimisticSeconds,
        bytes32 _start,
        uint256 _lastProcessed
    )
        ProcessingReplica(
            _originSLIP44,
            _ownSLIP44,
            _updater,
            _optimisticSeconds,
            _start,
            _lastProcessed
        )
    {}

    function setFailed() public {
        _setFailed();
    }

    function timestamp() external view returns (uint256) {
        return block.timestamp;
    }

    function setMessagePending(bytes memory _message) external {
        bytes29 _m = _message.ref(0);
        messages[_m.keccak()] = MessageStatus.Pending;
    }

    function setCurrentRoot(bytes32 _newRoot) external {
        current = _newRoot;
    }
}

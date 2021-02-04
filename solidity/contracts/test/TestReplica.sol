// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "../Replica.sol";

contract TestReplica is ProcessingReplica {

    constructor(
        uint32 _originSLIP44,
        uint32 _ownSLIP44,
        address _updater,
        uint256 _optimisticSeconds,
        bytes32 _start,
        uint256 _lastProcessed
    ) ProcessingReplica(_originSLIP44, _ownSLIP44, _updater, _optimisticSeconds, _start, _lastProcessed) {}

    function timestamp() external view returns (uint) {
        return block.timestamp;
    }
}
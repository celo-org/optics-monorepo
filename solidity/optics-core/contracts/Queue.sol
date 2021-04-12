// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "../libs/Queue.sol";

/**
 * @title QueueManager
 * @author Celo Labs Inc.
 * @notice Contract containing a queue instance and view operations on the
 * queue.
 **/
contract QueueManager {
    using QueueLib for QueueLib.Queue;
    QueueLib.Queue internal queue;

    /// @notice Returns number of elements in queue
    function queueLength() external view returns (uint256) {
        return queue.length();
    }

    /// @notice Returns true if `_item` is in the queue and false if otherwise
    function queueContains(bytes32 _item) external view returns (bool) {
        return queue.contains(_item);
    }

    /// @notice Returns last item in queue
    function queueEnd() external view returns (bytes32) {
        return queue.lastItem();
    }
}

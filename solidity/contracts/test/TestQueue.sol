// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "../Queue.sol";

contract TestQueue is QueueManager {
    using QueueLib for QueueLib.Queue;

    constructor() QueueManager() {}

    // NB: this is unfortunately expensive
    function contains(bytes32 _item) external view returns (bool) {
        return queue.contains(_item);
    }

    function lastItem() external view returns (bytes32) {
        return queue.lastItem();
    }

    function peek() external view returns (bytes32 _item) {
        return queue.peek();
    }

    function enqueue(bytes32 _item) external returns (uint256 _last) {
        return queue.enqueue(_item);
    }

    function dequeue() external returns (bytes32 _item) {
        return queue.dequeue();
    }

    function enqueueMany(bytes32[] calldata _items)
        external
        returns (uint256 _last)
    {
        return queue.enqueue(_items);
    }

    function dequeueMany(uint256 _number)
        external
        returns (bytes32[] memory _items)
    {
        return queue.dequeue(_number);
    }

    function length() external view returns (uint256) {
        return queue.length();
    }

    function drain() external {
        while (queue.length() != 0) {
            queue.dequeue();
        }
    }

    function initAgain() external {
        queue.init();
    }
}

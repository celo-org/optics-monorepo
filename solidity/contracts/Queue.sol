// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

library QueueLib {
    struct Queue {
        uint128 first;
        uint128 last;
        mapping(uint256 => bytes32) queue;
    }

    function init(Queue storage _q) internal {
        if (_q.first == 0) {
            _q.first = 1;
        }
    }

    function enqueue(Queue storage _q, bytes32 _item)
        internal
        returns (uint128 _last)
    {
        _last = _q.last + 1;
        _q.last = _last;
        if (_item != bytes32(0)) {
            // saves gas if we're queueing 0
            _q.queue[_last] = _item;
        }
    }

    function dequeue(Queue storage _q) internal returns (bytes32 _item) {
        uint128 _last = _q.last;
        uint128 _first = _q.first;
        require(_length(_last, _first) != 0, "Empty");
        _item = _q.queue[_first];
        if (_item != bytes32(0)) {
            // saves gas if we're dequeuing 0
            delete _q.queue[_first];
        }
        _q.first = _first + 1;
    }

    function enqueue(Queue storage _q, bytes32[] memory _items)
        internal
        returns (uint128 _last)
    {
        _last = _q.last;
        for (uint256 i = 0; i < _items.length; i += 1) {
            _last += 1;
            bytes32 _item = _items[i];
            if (_item != bytes32(0)) {
                _q.queue[_last] = _item;
            }
        }
        _q.last = _last;
    }

    function dequeue(Queue storage _q, uint256 _number)
        internal
        returns (bytes32[] memory)
    {
        uint128 _last = _q.last;
        uint128 _first = _q.first;
        // Cannot underflow unless state is corrupted
        require(_length(_last, _first) >= _number, "Insufficient");

        bytes32[] memory _items = new bytes32[](_number);

        for (uint256 i = 0; i < _number; i++) {
            _items[i] = _q.queue[_first];
            delete _q.queue[_first];
            _first++;
        }
        _q.first = _first;
        return _items;
    }

    // NB: this is unfortunately expensive
    function contains(Queue storage _q, bytes32 _item)
        internal
        view
        returns (bool)
    {
        for (uint256 i = _q.first; i < _q.last; i++) {
            if (_q.queue[i] == _item) {
                return true;
            }
        }
        return false;
    }

    function lastItem(Queue storage _q) internal view returns (bytes32) {
        return _q.queue[_q.last];
    }

    function peek(Queue storage _q) internal view returns (bytes32 _item) {
        require(!isEmpty(_q), "Empty");
        _item = _q.queue[_q.first];
    }

    function isEmpty(Queue storage _q) internal view returns (bool) {
        return _q.last < _q.first;
    }

    function _length(uint128 _last, uint128 _first)
        internal
        pure
        returns (uint256)
    {
        return uint256(_last + 1 - _first);
    }

    function length(Queue storage _q) internal view returns (uint256) {
        uint128 _last = _q.last;
        uint128 _first = _q.first;
        // Cannot underflow unless state is corrupted
        return _length(_last, _first);
    }
}

contract QueueManager {
    using QueueLib for QueueLib.Queue;
    QueueLib.Queue internal queue;

    constructor() {
        queue.init();
    }
}

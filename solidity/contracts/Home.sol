// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "./Common.sol";
import "./Merkle.sol";
import "./Queue.sol";
import "./Sortition.sol";

contract Home is MerkleTreeManager, QueueManager, Common {
    using QueueLib for QueueLib.Queue;
    using MerkleLib for MerkleLib.Tree;

    mapping(uint32 => uint32) public sequences;

    ISortition sortition;

    event Dispatch(
        uint32 indexed destination,
        uint32 indexed sequence,
        bytes32 indexed leaf,
        bytes message
    );
    event ImproperUpdate();

    constructor(uint32 _originSLIP44, address _sortition)
        payable
        MerkleTreeManager()
        QueueManager()
        Common(_originSLIP44, address(0), bytes32(0))
    {
        sortition = ISortition(_sortition);
        updater = ISortition(_sortition).current();
    }

    function fail() internal override {
        _setFailed();
        sortition.slash(msg.sender);
    }

    function enqueue(
        uint32 destination,
        bytes32 recipient,
        bytes memory body
    ) external notFailed {
        uint32 sequence = sequences[destination] + 1;
        sequences[destination] = sequence;

        bytes memory _message =
            Message.formatMessage(
                originSLIP44,
                bytes32(uint256(uint160(msg.sender))),
                sequence,
                destination,
                recipient,
                body
            );
        bytes32 _leaf = keccak256(_message);

        tree.insert(_leaf);
        queue.enqueue(root());
        emit Dispatch(destination, sequence, _leaf, _message);
    }

    function update(
        bytes32 _oldRoot,
        bytes32 _newRoot,
        bytes memory _signature
    ) external notFailed {
        if (improperUpdate(_newRoot, _oldRoot, _signature)) return;
        while (true) {
            bytes32 next = queue.dequeue();
            if (next == _newRoot) break;
        }
        emit Update(originSLIP44, _oldRoot, _newRoot, _signature);
    }

    function improperUpdate(
        bytes32 _oldRoot,
        bytes32 _newRoot,
        bytes memory _signature
    ) public notFailed returns (bool) {
        require(Common.checkSig(_newRoot, _oldRoot, _signature), "bad sig");
        require(_oldRoot == current, "Not a current update");
        if (!queue.contains(_newRoot)) {
            fail();
            emit ImproperUpdate();
            return true;
        }
        return false;
    }

    function suggestUpdate()
        external
        view
        returns (bytes32 _current, bytes32 _new)
    {
        if (queue.length() != 0) {
            _current = current;
            _new = queue.lastItem();
        }
    }
}

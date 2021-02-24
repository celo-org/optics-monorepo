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
        uint256 indexed leafIndex,
        uint64 indexed destinationAndSequence,
        bytes32 indexed leaf,
        bytes message
    );
    event ImproperUpdate();

    constructor(uint32 _originDomain, address _sortition)
        payable
        MerkleTreeManager()
        QueueManager()
        Common(_originDomain, address(0), bytes32(0))
    {
        sortition = ISortition(_sortition);
        updater = ISortition(_sortition).current();
    }

    function fail() internal override {
        _setFailed();
        sortition.slash(msg.sender);
    }

    function destinationAndSequence(uint32 _destination, uint32 _sequence)
        internal
        pure
        returns (uint64)
    {
        return (uint64(_destination) << 32) | _sequence;
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
                originDomain,
                bytes32(uint256(uint160(msg.sender))),
                sequence,
                destination,
                recipient,
                body
            );
        bytes32 _leaf = keccak256(_message);

        tree.insert(_leaf);
        queue.enqueue(root());

        // leafIndex is count() - 1 since new leaf has already been inserted
        emit Dispatch(
            count() - 1,
            destinationAndSequence(destination, sequence),
            _leaf,
            _message
        );
    }

    function update(
        bytes32 _oldRoot,
        bytes32 _newRoot,
        bytes memory _signature
    ) external notFailed {
        if (improperUpdate(_oldRoot, _newRoot, _signature)) return;
        while (true) {
            bytes32 next = queue.dequeue();
            if (next == _newRoot) break;
        }

        current = _newRoot;
        emit Update(originDomain, _oldRoot, _newRoot, _signature);
    }

    function improperUpdate(
        bytes32 _oldRoot,
        bytes32 _newRoot,
        bytes memory _signature
    ) public notFailed returns (bool) {
        require(Common.checkSig(_oldRoot, _newRoot, _signature), "bad sig");
        require(_oldRoot == current, "not a current update");
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

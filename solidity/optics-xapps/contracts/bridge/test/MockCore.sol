// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import {MerkleTreeManager} from "@celo-org/optics-sol/contracts/Merkle.sol";
import {QueueManager} from "@celo-org/optics-sol/contracts/Queue.sol";

import {Message} from "@celo-org/optics-sol/libs/Message.sol";
import {MerkleLib} from "@celo-org/optics-sol/libs/Merkle.sol";
import {QueueLib} from "@celo-org/optics-sol/libs/Queue.sol";

// We reproduce a significant amount of logic from `Home` to ensure that
// calling enqueue here is AT LEAST AS EXPENSIVE as calling it on home
contract MockCore is MerkleTreeManager, QueueManager {
    using QueueLib for QueueLib.Queue;
    using MerkleLib for MerkleLib.Tree;

    uint256 public constant MAX_MESSAGE_BODY_BYTES = 2 * 2**10;

    event Enqueue(
        uint32 indexed _destination,
        bytes32 indexed _recipient,
        bytes _body
    );
    event Dispatch(
        uint256 indexed leafIndex,
        uint64 indexed destinationAndSequence,
        bytes32 indexed leaf,
        bytes message
    );

    mapping(uint32 => uint32) public sequences;

    function localDomain() public pure returns (uint32) {
        return 5;
    }

    function home() external view returns (address) {
        return address(this);
    }

    // We reproduce the logic here to simulate
    function enqueue(
        uint32 _destination,
        bytes32 _recipient,
        bytes calldata _body
    ) external {
        require(_body.length <= MAX_MESSAGE_BODY_BYTES, "!too big");
        uint32 _sequence = sequences[_destination];

        bytes memory _message = Message.formatMessage(
            localDomain(),
            bytes32(uint256(uint160(msg.sender))),
            _sequence,
            _destination,
            _recipient,
            _body
        );
        bytes32 _leaf = keccak256(_message);

        tree.insert(_leaf);
        queue.enqueue(root());

        // leafIndex is count() - 1 since new leaf has already been inserted
        emit Dispatch(
            count() - 1,
            _destinationAndSequence(_destination, _sequence),
            _leaf,
            _message
        );
        emit Enqueue(_destination, _recipient, _body);

        sequences[_destination] = _sequence + 1;
    }

    function isReplica(address) public pure returns (bool) {
        return true;
    }

    function _destinationAndSequence(uint32 _destination, uint32 _sequence)
        internal
        pure
        returns (uint64)
    {
        return (uint64(_destination) << 32) | _sequence;
    }
}

// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "./Common.sol";
import "./Merkle.sol";
import "./Queue.sol";
import "../interfaces/IUpdaterManager.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * @title Home
 * @author Celo Labs Inc.
 * @notice Contract responsible for managing production of the message tree and
 * holding custody of the updater bond.
 */
contract Home is Ownable, MerkleTreeManager, QueueManager, Common {
    using QueueLib for QueueLib.Queue;
    using MerkleLib for MerkleLib.Tree;

    /// @notice Mapping of sequence numbers for each destination
    mapping(uint32 => uint32) public sequences;

    IUpdaterManager public updaterManager;

    /**
     * @notice Event emitted when new message is enqueued
     * @param leafIndex Index of message's leaf in merkle tree
     * @param destinationAndSequence Destination and destination-specific
     * sequence combined in single field ((destination << 32) & sequence)
     * @param leaf Hash of formatted message
     * @param message Raw bytes of enqueued message
     */
    event Dispatch(
        uint256 indexed leafIndex,
        uint64 indexed destinationAndSequence,
        bytes32 indexed leaf,
        bytes message
    );

    /// @notice Event emitted when improper update detected
    event ImproperUpdate();

    /**
     * @notice Event emitted when the UpdaterManager sets a new updater on Home
     * @param updater The address of the new updater
     */
    event NewUpdater(address updater);

    /**
     * @notice Event emitted when a new UpdaterManager is set
     * @param updaterManager The address of the new updaterManager
     */
    event NewUpdaterManager(address updaterManager);

    /**
     * @notice Event emitted when an updater is slashed
     * @param updater The address of the updater
     * @param reporter The address of the entity that reported the updater misbehavior
     */
    event UpdaterSlashed(address indexed updater, address indexed reporter);

    function initialize(uint32 _localDomain, address _updaterManager)
        public
        override
    {
        require(state == States.UNINITIALIZED, "already initialized");

        setLocalDomain(_localDomain);

        updaterManager = IUpdaterManager(_updaterManager);
        updater = IUpdaterManager(_updaterManager).updater();

        queue.initialize();
        state = States.ACTIVE;
    }

    modifier onlyUpdaterManager {
        require(msg.sender == address(updaterManager), "!updaterManager");
        _;
    }

    /// @notice Sets updater
    function setUpdater(address _updater) external onlyUpdaterManager {
        updater = _updater;

        emit NewUpdater(_updater);
    }

    /// @notice sets a new updaterManager
    function setUpdaterManager(address _updaterManager) external onlyOwner {
        require(
            Address.isContract(_updaterManager),
            "!contract updaterManager"
        );

        updaterManager = IUpdaterManager(_updaterManager);
        emit NewUpdaterManager(_updaterManager);
    }

    /// @notice Sets contract state to FAILED and slashes updater
    function fail() internal override {
        _setFailed();
        updaterManager.slashUpdater(msg.sender);

        emit UpdaterSlashed(updater, msg.sender);
    }

    /**
     * @notice Internal utility function that combines provided `_destination`
     * and `_sequence`.
     * @dev Both destination and sequence should be < 2^32 - 1
     * @param _destination Domain of destination chain
     * @param _sequence Current sequence for given destination chain
     * @return Returns (`_destination` << 32) & `_sequence`
     */
    function destinationAndSequence(uint32 _destination, uint32 _sequence)
        internal
        pure
        returns (uint64)
    {
        return (uint64(_destination) << 32) | _sequence;
    }

    /**
     * @notice Formats message, adds its leaf into merkle tree, enqueues new
     * merkle root, and emits `Dispatch` event with data regarding message.
     * @param destination Domain of destination chain
     * @param recipient Address or recipient on destination chain
     * @param body Raw bytes of message
     */
    function enqueue(
        uint32 destination,
        bytes32 recipient,
        bytes memory body
    ) external notFailed {
        uint32 sequence = sequences[destination] + 1;
        sequences[destination] = sequence;

        bytes memory _message =
            Message.formatMessage(
                localDomain,
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

    /**
     * @notice Called by updater. Updates home's `current` root from `_oldRoot`
     * to `_newRoot` and emits `Update` event. If fraudulent update
     * detected in `improperUpdate`, updater is slashed and home is
     * failed.
     * @param _oldRoot Old merkle root (should equal home's current root)
     * @param _newRoot New merkle root
     * @param _signature Updater's signature on `_oldRoot` and `_newRoot`
     */
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
        emit Update(localDomain, _oldRoot, _newRoot, _signature);
    }

    /**
     * @notice Checks that `_newRoot` in update currently exists in queue. If
     * `_newRoot` doesn't exist in queue, update is fraudulent, causing
     * updater to be slashed and home to be failed.
     * @dev Reverts (and doesn't slash updater) if signature is invalid or
     * update not current
     * @param _oldRoot Old merkle tree root (should equal home's current root)
     * @param _newRoot New merkle tree root
     * @param _signature Updater's signature on `_oldRoot` and `_newRoot`
     * @return Returns true if update was fraudulent
     */
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

    /**
     * @notice Suggests an update to caller. If queue is non-empty, returns the
     * home's current root as `_current` and the queue's latest root as
     * `_new`. Null bytes returned if queue is empty.
     * @return _current Current root
     * @return _new New root
     */
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

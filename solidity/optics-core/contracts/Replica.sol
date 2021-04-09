// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "./Common.sol";
import "./Merkle.sol";
import "./Queue.sol";
import {MessageRecipientI} from "../interfaces/MessageRecipientI.sol";

import "@summa-tx/memview-sol/contracts/TypedMemView.sol";

/**
 * @title Replica
 * @author Celo Labs Inc.
 * @notice Contract responsible for tracking root updates on home,
 * and dispatching messages on Replica to end recipients.
 */
contract Replica is Common, QueueManager {
    using QueueLib for QueueLib.Queue;
    using MerkleLib for MerkleLib.Tree;
    using TypedMemView for bytes;
    using TypedMemView for bytes29;
    using Message for bytes29;

    /// @notice Domain of replica's native chain
    uint32 public immutable ownDomain;

    /// @notice Minimum gas for message processing
    uint256 public constant PROCESS_GAS = 500000;
    /// @notice Reserved gas (to ensure tx completes in case message processing runs out)
    uint256 public constant RESERVE_GAS = 10000;

    /// @notice Number of seconds to wait before enqueued root becomes confirmable
    uint256 public optimisticSeconds;

    /// @notice Index of last processed message's leaf in home's merkle tree
    uint256 public lastProcessed;

    bytes32 public previous; // to smooth over witness invalidation

    /// @notice Mapping of enqueued roots to allowable confirmation times
    mapping(bytes32 => uint256) public confirmAt;

    /// @notice Status of message
    enum MessageStatus {None, Pending, Processed}

    /// @notice Mapping of message leaves to MessageStatus
    mapping(bytes32 => MessageStatus) public messages;

    constructor(uint32 _ownDomain) {
        ownDomain = _ownDomain;
    }

    function initialize(
        uint32 _originDomain,
        address _updater,
        bytes32 _current,
        uint256 _optimisticSeconds,
        uint256 _lastProcessed
    ) public {
        require(state == States.UNINITIALIZED, "already initialized");

        setOriginDomain(_originDomain);

        queue.initialize();

        updater = _updater;
        current = _current;
        optimisticSeconds = _optimisticSeconds;
        lastProcessed = _lastProcessed;

        state = States.ACTIVE;
    }

    /// @notice Sets contract state to FAILED
    function fail() internal override {
        _setFailed();
    }

    /**
     * @notice Called by external agent. Returns next pending root to be
     * confirmed and its confirmation time. If queue is empty, returns null
     * values.
     * @return _pending Pending (unconfirmed) root
     * @return _confirmAt Pending root's confirmation time
     **/
    function nextPending()
        external
        view
        returns (bytes32 _pending, uint256 _confirmAt)
    {
        if (queue.length() != 0) {
            _pending = queue.peek();
            _confirmAt = confirmAt[_pending];
        }
    }

    /**
     * @notice Called by external agent. Enqueues signed update's new root,
     * marks root's allowable confirmation time, and emits an `Update` event.
     * @dev Reverts if update doesn't build off queue's last root or replica's
     * current root if queue is empty. Also reverts if signature is invalid.
     * @param _oldRoot Old merkle root
     * @param _newRoot New merkle root
     * @param _signature Updater's signature on `_oldRoot` and `_newRoot`
     **/
    function update(
        bytes32 _oldRoot,
        bytes32 _newRoot,
        bytes memory _signature
    ) external notFailed {
        if (queue.length() > 0) {
            require(_oldRoot == queue.lastItem(), "not end of queue");
        } else {
            require(current == _oldRoot, "not current update");
        }
        require(Common.checkSig(_oldRoot, _newRoot, _signature), "bad sig");

        _beforeUpdate();

        confirmAt[_newRoot] = block.timestamp + optimisticSeconds;
        queue.enqueue(_newRoot);

        emit Update(originDomain, _oldRoot, _newRoot, _signature);
    }

    /**
     * @notice Called by external agent. Returns true if there is a confirmable
     * root in the queue and false if otherwise.
     **/
    function canConfirm() external view returns (bool) {
        return
            queue.length() != 0 && block.timestamp >= confirmAt[queue.peek()];
    }

    /**
     * @notice Called by external agent. Confirms as many confirmable roots in
     * queue as possible, updating replica's current root to be the last
     * confirmed root.
     * @dev Reverts if queue started as empty (i.e. no roots to confirm)
     **/
    function confirm() external notFailed {
        require(queue.length() != 0, "no pending");

        bytes32 _pending;
        uint256 _now = block.timestamp;

        uint256 _remaining = queue.length();
        while (_remaining > 0 && _now >= confirmAt[queue.peek()]) {
            _pending = queue.dequeue();
            delete confirmAt[_pending];
            _remaining -= 1;
        }

        // This condition is hit if the while loop is never executed, because
        // the first queue item has not hit its timer yet
        require(_pending != bytes32(0), "not time");

        _beforeConfirm();

        current = _pending;
    }

    /// @notice Sets `previous` to `current` root before updating `current`
    function _beforeConfirm() internal {
        previous = current;
    }

    // solhint-disable-next-line no-empty-blocks
    function _beforeUpdate() internal {}

    /**
     * @notice Given formatted message, attempts to dispatch message payload to
     * end recipient.
     * @dev Requires recipient to have implemented `handle` method (refer to
     * XAppConnectionManager.sol). Reverts if formatted message's destination domain
     * doesn't match replica's own domain, if message is out of order (skips
     * one or more sequence numbers), if message has not been proven (doesn't
     * have MessageStatus.Pending), or if not enough gas is provided for
     * dispatch transaction.
     * @param _message Formatted message (refer to Common.sol Message library)
     * @return _success True if dispatch transaction succeeded (false if
     * otherwise)
     * @return _result Response returned by recipient's `handle` method on
     * success. Error if dispatch transaction failed.
     **/
    function process(bytes memory _message)
        public
        returns (bool _success, bytes memory _result)
    {
        bytes29 _m = _message.ref(0);

        uint32 _sequence = _m.sequence();
        require(_m.destination() == ownDomain, "!destination");
        require(_sequence == lastProcessed + 1, "!sequence");
        require(
            messages[keccak256(_message)] == MessageStatus.Pending,
            "not pending"
        );

        // Set the state now. We will set lastProcessed later. This prevents
        // re-entry as one of the two require statements above will definitely
        // fail.
        messages[_m.keccak()] = MessageStatus.Processed;

        bytes memory payload = _m.body().clone();
        address recipient = _m.recipientAddress();

        // NB:
        // A call running out of gas TYPICALLY errors the whole tx. We want to
        // a) ensure the call has a sufficient amount of gas to make a
        //    meaningful state change.
        // b) ensure that if the subcall runs out of gas, that the tx as a whole
        //    does not revert (i.e. we still mark the message processed)
        // To do this, we require that we have enough gas to process
        // and still return. We then delegate only the minimum processing gas.
        require(gasleft() >= PROCESS_GAS + RESERVE_GAS, "!gas");
        // transparently return.

        try
            MessageRecipientI(recipient).handle{gas: PROCESS_GAS}(
                _m.origin(),
                _m.sender(),
                payload
            )
        returns (bytes memory _response) {
            _success = true;
            _result = _response;
        } catch (bytes memory _err) {
            _success = false;
            _result = _err;
        }

        lastProcessed = _sequence;
    }

    /**
     * @notice Attempts to prove the validity of message given its leaf, the
     * merkle proof of inclusion for the leaf, and the index of the leaf.
     * @dev Reverts if message's MessageStatus != None (i.e. if message was
     * already proven or processed)
     * @param leaf Leaf of message to prove
     * @param proof Merkle proof of inclusion for leaf
     * @param index Index of leaf in home's merkle tree
     * @return Returns true if proof was valid and `prove` call succeeded
     **/
    function prove(
        bytes32 leaf,
        bytes32[32] calldata proof,
        uint256 index
    ) public returns (bool) {
        require(messages[leaf] == MessageStatus.None, "!MessageStatus.None");
        bytes32 actual = MerkleLib.branchRoot(leaf, proof, index);

        // NB:
        // For convenience, we allow proving against the previous root.
        // This means that witnesses don't need to be updated for the new root
        if (actual == current || actual == previous) {
            messages[leaf] = MessageStatus.Pending;
            return true;
        }
        return false;
    }

    /**
     * @notice First attempts to prove the validity of provided formatted
     * `message`. If the message is successfully proven, then tries to process
     * message.
     * @dev Reverts if `prove` call returns false
     * @param message Formatted message (refer to Common.sol Message library)
     * @param proof Merkle proof of inclusion for message's leaf
     * @param index Index of leaf in home's merkle tree
     **/
    function proveAndProcess(
        bytes memory message,
        bytes32[32] calldata proof,
        uint256 index
    ) external {
        require(prove(keccak256(message), proof, index), "!prove");
        process(message);
    }
}

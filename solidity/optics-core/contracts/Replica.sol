// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "@summa-tx/memview-sol/contracts/TypedMemView.sol";
import "./Common.sol";
import "./Merkle.sol";
import "./Queue.sol";
import {OpticsHandlerI} from "./UsingOptics.sol";

abstract contract Replica is Common, QueueManager {
    using QueueLib for QueueLib.Queue;

    uint32 public immutable ownDomain;
    uint256 public optimisticSeconds;

    mapping(bytes32 => uint256) public confirmAt;

    constructor(
        uint32 _originDomain,
        uint32 _ownDomain,
        address _updater,
        uint256 _optimisticSeconds,
        bytes32 _current
    ) Common(_originDomain, _updater, _current) QueueManager() {
        ownDomain = _ownDomain;
        optimisticSeconds = _optimisticSeconds;
        current = _current;
    }

    function fail() internal override {
        _setFailed();
    }

    /// Hook for tasks
    function _beforeConfirm() internal virtual;

    /// Hook for tasks
    function _beforeUpdate() internal virtual;

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

    // TODO: refactor to queue
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

    function canConfirm() external view returns (bool) {
        return
            queue.length() != 0 && block.timestamp >= confirmAt[queue.peek()];
    }

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
}

contract ProcessingReplica is Replica {
    using MerkleLib for MerkleLib.Tree;
    using TypedMemView for bytes;
    using TypedMemView for bytes29;
    using Message for bytes29;

    // minimum gas for message processing
    uint256 public constant PROCESS_GAS = 500000;
    // reserved gas (to ensure tx completes in case message processing runs out)
    uint256 public constant RESERVE_GAS = 10000;

    bytes32 public previous; // to smooth over witness invalidation
    uint256 public lastProcessed;
    mapping(bytes32 => MessageStatus) public messages;
    enum MessageStatus {None, Pending, Processed}

    constructor(
        uint32 _originDomain,
        uint32 _ownDomain,
        address _updater,
        uint256 _optimisticSeconds,
        bytes32 _start,
        uint256 _lastProcessed
    ) Replica(_originDomain, _ownDomain, _updater, _optimisticSeconds, _start) {
        lastProcessed = _lastProcessed;
    }

    function _beforeConfirm() internal override {
        previous = current;
    }

    function _beforeUpdate() internal override {}

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

        // TODO: assembly this to avoid the clone?
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
            OpticsHandlerI(recipient).handle{gas: PROCESS_GAS}(
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

        // (_success, _ret) = recipient.call{gas: PROCESS_GAS}(payload);
        lastProcessed = _sequence;
    }

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

    function proveAndProcess(
        bytes memory message,
        bytes32[32] calldata proof,
        uint256 index
    ) external {
        require(prove(keccak256(message), proof, index), "!prove");
        process(message);
    }
}

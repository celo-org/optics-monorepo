// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "../Replica.sol";

contract TestReplica is Replica {
    using TypedMemView for bytes;
    using TypedMemView for bytes29;
    using Message for bytes29;

    constructor(uint32 _localDomain) Replica(_localDomain) {} // solhint-disable-line no-empty-blocks

    function setFailed() public {
        _setFailed();
    }

    function setUpdater(address _updater) external {
        updater = _updater;
    }

    function setRemoteDomain(uint32 _remoteDomain) external {
        remoteDomain = _remoteDomain;
    }

    function setMessagePending(bytes memory _message) external {
        bytes29 _m = _message.ref(0);
        messages[_m.keccak()] = MessageStatus.Pending;
    }

    function setCurrentRoot(bytes32 _newRoot) external {
        current = _newRoot;
    }

    function timestamp() external view returns (uint256) {
        return block.timestamp;
    }

    function testSignatureDomain() external view returns (bytes32) {
        return signatureDomain();
    }

    function testBranchRoot(
        bytes32 leaf,
        bytes32[32] calldata proof,
        uint256 index
    ) external pure returns (bytes32) {
        return MerkleLib.branchRoot(leaf, proof, index);
    }
}

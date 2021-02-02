// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "../Home.sol";

contract TestHome is Home {
    using QueueLib for QueueLib.Queue;
    using MerkleLib for MerkleLib.Tree;

    constructor(uint32 _originSLIP44, address _sortition) Home(_originSLIP44, _sortition) {}

    function setFailed() public {
        _setFailed();
    }

    function testCheckSig(
        bytes32 _oldRoot, 
        bytes32 _newRoot, 
        bytes memory _signature
    ) public view returns (address) {
        bytes32 _digest =
            keccak256(abi.encodePacked(DOMAIN_HASH, _oldRoot, _newRoot));
        _digest = ECDSA.toEthSignedMessageHash(_digest);
        return ECDSA.recover(_digest, _signature);
    }
}
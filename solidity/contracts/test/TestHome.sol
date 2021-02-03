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
}
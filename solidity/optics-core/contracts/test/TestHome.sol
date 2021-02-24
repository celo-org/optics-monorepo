// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "../Home.sol";

contract TestHome is Home {
    using QueueLib for QueueLib.Queue;
    using MerkleLib for MerkleLib.Tree;

    constructor(uint32 _originDomain, address _sortition)
        Home(_originDomain, _sortition)
    {}

    function nextLeafIndex() external view returns (uint256) {
        return count();
    }

    function setFailed() public {
        _setFailed();
    }

    function testDestinationAndSequence(uint32 _destination, uint32 _sequence)
        external
        pure
        returns (uint64)
    {
        return destinationAndSequence(_destination, _sequence);
    }
}

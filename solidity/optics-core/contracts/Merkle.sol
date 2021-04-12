// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "../libs/Merkle.sol";

/**
 * @title MerkleTreeManager
 * @author Celo Labs Inc.
 * @notice Contract containing a merkle tree instance and view operations on
 * the tree.
 **/
contract MerkleTreeManager {
    using MerkleLib for MerkleLib.Tree;

    MerkleLib.Tree public tree;

    /// @notice Calculates and returns`tree`'s current root
    function root() public view returns (bytes32) {
        return tree.root();
    }

    /// @notice Returns the number of inserted leaves in the tree (current index)
    function count() public view returns (uint256) {
        return tree.count;
    }
}

// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "../Merkle.sol";

contract TestMerkle is MerkleTreeManager {
    using MerkleLib for MerkleLib.Tree;

    constructor() MerkleTreeManager() {}

     function count() external view returns (uint256) {
        return tree.count;
     }

     function insert(bytes32 _node) external {
        tree.insert(_node);
     }

      function branchRoot(
         bytes32 leaf,
         bytes32[32] calldata proof,
         uint256 index
      ) external pure returns (bytes32 _node) {
         return MerkleLib.branchRoot(leaf, proof, index);
     }
}

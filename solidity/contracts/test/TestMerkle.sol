// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity >=0.6.11;

import "../Merkle.sol";

contract TestMerkle is MerkleTreeManager {
    using MerkleLib for MerkleLib.Tree;

    constructor() MerkleTreeManager() {}
}

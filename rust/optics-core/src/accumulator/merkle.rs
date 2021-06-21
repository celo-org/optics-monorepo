use ethers::core::types::H256;
use lazy_static::lazy_static;
use thiserror::Error;

use crate::{
    accumulator::{hash_concat, EMPTY_SLICE, TREE_DEPTH, ZERO_HASHES},
    Decode, Encode,
};

// Some code has been derived from
// https://github.com/sigp/lighthouse/blob/c6baa0eed131c5e8ecc5860778ffc7d4a4c18d2d/consensus/merkle_proof/src/lib.rs#L25
// It has been modified as follows:
//    - improve legibility
//    - remove eth2-specific features.
//    - use keccak256
//    - remove ring dependency
// In accordance with its license terms, the apache2 license is reproduced below

lazy_static! {
    /// Zero nodes to act as "synthetic" left and right subtrees of other zero nodes.
    pub static ref ZERO_NODES: Vec<MerkleTree> = {
        (0..=TREE_DEPTH).map(MerkleTree::Zero).collect()
    };
}

/// Right-sparse Merkle tree.
///
/// Efficiently represents a Merkle tree of fixed depth where only the first N
/// indices are populated by non-zero leaves (perfect for the deposit contract tree).
#[derive(Debug, PartialEq)]
pub enum MerkleTree {
    /// Leaf node with the hash of its content.
    Leaf(H256),
    /// Internal node with hash, left subtree and right subtree.
    Node(H256, Box<Self>, Box<Self>),
    /// Zero subtree of a given depth.
    ///
    /// It represents a Merkle tree of 2^depth zero leaves.
    Zero(usize),
}

/// A merkle proof object. The leaf, its path to the root, and its index in the
/// tree.
#[derive(Debug, Clone, Copy, serde::Deserialize, serde::Serialize, PartialEq)]
pub struct Proof {
    /// The leaf
    pub leaf: H256,
    /// The index
    pub index: usize,
    /// The merkle branch
    pub path: [H256; TREE_DEPTH],
}

impl Encode for Proof {
    fn write_to<W>(&self, writer: &mut W) -> std::io::Result<usize>
    where
        W: std::io::Write,
    {
        writer.write_all(self.leaf.as_bytes())?;
        writer.write_all(&self.index.to_be_bytes())?;
        for hash in self.path.iter() {
            writer.write_all(hash.as_bytes())?;
        }
        Ok(32 + 8 + TREE_DEPTH * 32)
    }
}

impl Decode for Proof {
    fn read_from<R>(reader: &mut R) -> Result<Self, crate::OpticsError>
    where
        R: std::io::Read,
        Self: Sized,
    {
        let mut leaf = H256::default();
        let mut index_bytes = [0u8; 8];
        let mut path = [H256::default(); 32];

        reader.read_exact(leaf.as_bytes_mut())?;
        reader.read_exact(&mut index_bytes)?;
        for item in &mut path {
            reader.read_exact(item.as_bytes_mut())?;
        }

        let index = u64::from_be_bytes(index_bytes) as usize;

        Ok(Self { leaf, index, path })
    }
}

/// Error type for merkle tree ops.
#[derive(Debug, PartialEq, Clone, Error)]
pub enum MerkleTreeError {
    /// Trying to push in a leaf
    #[error("Trying to push in a leaf")]
    LeafReached,
    /// No more space in the MerkleTree
    #[error("No more space in the MerkleTree")]
    MerkleTreeFull,
    /// MerkleTree is invalid
    #[error("MerkleTree is invalid")]
    Invalid,
    /// Incorrect Depth provided
    #[error("Incorrect Depth provided")]
    DepthTooSmall,
}

impl MerkleTree {
    /// Retrieve the root hash of this Merkle tree.
    pub fn hash(&self) -> H256 {
        match *self {
            MerkleTree::Leaf(h) => h,
            MerkleTree::Node(h, _, _) => h,
            MerkleTree::Zero(depth) => ZERO_HASHES[depth],
        }
    }

    /// Create a new Merkle tree from a list of leaves and a fixed depth.
    pub fn create(leaves: &[H256], depth: usize) -> Self {
        use MerkleTree::*;

        if leaves.is_empty() {
            return Zero(depth);
        }

        match depth {
            0 => {
                debug_assert_eq!(leaves.len(), 1);
                Leaf(leaves[0])
            }
            _ => {
                // Split leaves into left and right subtrees
                let subtree_capacity = 2usize.pow(depth as u32 - 1);
                let (left_leaves, right_leaves) = if leaves.len() <= subtree_capacity {
                    (leaves, EMPTY_SLICE)
                } else {
                    leaves.split_at(subtree_capacity)
                };

                let left_subtree = MerkleTree::create(left_leaves, depth - 1);
                let right_subtree = MerkleTree::create(right_leaves, depth - 1);
                let hash = hash_concat(left_subtree.hash(), right_subtree.hash());

                Node(hash, Box::new(left_subtree), Box::new(right_subtree))
            }
        }
    }

    /// Push an element in the MerkleTree.
    /// MerkleTree and depth must be correct, as the algorithm expects valid data.
    pub fn push_leaf(&mut self, elem: H256, depth: usize) -> Result<(), MerkleTreeError> {
        use MerkleTree::*;

        if depth == 0 {
            return Err(MerkleTreeError::DepthTooSmall);
        }

        match self {
            Leaf(_) => return Err(MerkleTreeError::LeafReached),
            Zero(_) => {
                *self = MerkleTree::create(&[elem], depth);
            }
            Node(ref mut hash, ref mut left, ref mut right) => {
                let left: &mut MerkleTree = &mut *left;
                let right: &mut MerkleTree = &mut *right;
                match (&*left, &*right) {
                    // Tree is full
                    (Leaf(_), Leaf(_)) => return Err(MerkleTreeError::MerkleTreeFull),
                    // There is a right node so insert in right node
                    (Node(_, _, _), Node(_, _, _)) => {
                        if let Err(e) = right.push_leaf(elem, depth - 1) {
                            return Err(e);
                        }
                    }
                    // Both branches are zero, insert in left one
                    (Zero(_), Zero(_)) => {
                        *left = MerkleTree::create(&[elem], depth - 1);
                    }
                    // Leaf on left branch and zero on right branch, insert on right side
                    (Leaf(_), Zero(_)) => {
                        *right = MerkleTree::create(&[elem], depth - 1);
                    }
                    // Try inserting on the left node -> if it fails because it is full, insert in right side.
                    (Node(_, _, _), Zero(_)) => {
                        match left.push_leaf(elem, depth - 1) {
                            Ok(_) => (),
                            // Left node is full, insert in right node
                            Err(MerkleTreeError::MerkleTreeFull) => {
                                *right = MerkleTree::create(&[elem], depth - 1);
                            }
                            Err(e) => return Err(e),
                        };
                    }
                    // All other possibilities are invalid MerkleTrees
                    (_, _) => return Err(MerkleTreeError::Invalid),
                };
                hash.assign_from_slice(hash_concat(left.hash(), right.hash()).as_ref());
            }
        }

        Ok(())
    }
    /// Get a reference to the left and right subtrees if they exist.
    pub fn left_and_right_branches(&self) -> Option<(&Self, &Self)> {
        match *self {
            MerkleTree::Leaf(_) | MerkleTree::Zero(0) => None,
            MerkleTree::Node(_, ref l, ref r) => Some((l, r)),
            MerkleTree::Zero(depth) => Some((&ZERO_NODES[depth - 1], &ZERO_NODES[depth - 1])),
        }
    }

    /// Is this Merkle tree a leaf?
    pub fn is_leaf(&self) -> bool {
        matches!(self, MerkleTree::Leaf(_))
    }

    /// Return the leaf at `index` and a Merkle proof of its inclusion.
    ///
    /// The Merkle proof is in "bottom-up" order, starting with a leaf node
    /// and moving up the tree. Its length will be exactly equal to `depth`.
    pub fn generate_proof(&self, index: usize, depth: usize) -> (H256, Vec<H256>) {
        let mut proof = vec![];
        let mut current_node = self;
        let mut current_depth = depth;
        while current_depth > 0 {
            let ith_bit = (index >> (current_depth - 1)) & 0x01;
            // Note: unwrap is safe because leaves are only ever constructed at depth == 0.
            let (left, right) = current_node.left_and_right_branches().unwrap();

            // Go right, include the left branch in the proof.
            if ith_bit == 1 {
                proof.push(left.hash());
                current_node = right;
            } else {
                proof.push(right.hash());
                current_node = left;
            }
            current_depth -= 1;
        }

        debug_assert_eq!(proof.len(), depth);
        debug_assert!(current_node.is_leaf());

        // Put proof in bottom-up order.
        proof.reverse();

        (current_node.hash(), proof)
    }
}

/// Verify a proof that `leaf` exists at `index` in a Merkle tree rooted at `root`.
///
/// The `branch` argument is the main component of the proof: it should be a list of internal
/// node hashes such that the root can be reconstructed (in bottom-up order).
pub fn verify_merkle_proof(
    leaf: H256,
    branch: &[H256],
    depth: usize,
    index: usize,
    root: H256,
) -> bool {
    if branch.len() == depth {
        merkle_root_from_branch(leaf, branch, depth, index) == root
    } else {
        false
    }
}

/// Compute a root hash from a leaf and a Merkle proof.
pub fn merkle_root_from_branch(leaf: H256, branch: &[H256], depth: usize, index: usize) -> H256 {
    assert_eq!(branch.len(), depth, "proof length should equal depth");

    let mut current = leaf;

    for (i, next) in branch.iter().enumerate().take(depth) {
        let ith_bit = (index >> i) & 0x01;
        if ith_bit == 1 {
            current = hash_concat(next, current);
        } else {
            current = hash_concat(current, next);
        }
    }

    current
}

#[cfg(test)]
mod tests {
    use crate::accumulator::incremental;

    use super::*;

    #[test]
    fn sparse_zero_correct() {
        let depth = 2;
        let zero = H256::from([0x00; 32]);
        let dense_tree = MerkleTree::create(&[zero, zero, zero, zero], depth);
        let sparse_tree = MerkleTree::create(&[], depth);
        assert_eq!(dense_tree.hash(), sparse_tree.hash());
    }

    #[test]
    fn create_small_example() {
        // Construct a small merkle tree manually and check that it's consistent with
        // the MerkleTree type.
        let leaf_b00 = H256::from([0xAA; 32]);
        let leaf_b01 = H256::from([0xBB; 32]);
        let leaf_b10 = H256::from([0xCC; 32]);
        let leaf_b11 = H256::from([0xDD; 32]);

        let node_b0x = hash_concat(leaf_b00, leaf_b01);
        let node_b1x = hash_concat(leaf_b10, leaf_b11);

        let root = hash_concat(node_b0x, node_b1x);

        let tree = MerkleTree::create(&[leaf_b00, leaf_b01, leaf_b10, leaf_b11], 2);
        assert_eq!(tree.hash(), root);
    }

    #[test]
    fn verify_small_example() {
        // Construct a small merkle tree manually
        let leaf_b00 = H256::from([0xAA; 32]);
        let leaf_b01 = H256::from([0xBB; 32]);
        let leaf_b10 = H256::from([0xCC; 32]);
        let leaf_b11 = H256::from([0xDD; 32]);

        let node_b0x = hash_concat(leaf_b00, leaf_b01);
        let node_b1x = hash_concat(leaf_b10, leaf_b11);

        let root = hash_concat(node_b0x, node_b1x);

        // Run some proofs
        assert!(verify_merkle_proof(
            leaf_b00,
            &[leaf_b01, node_b1x],
            2,
            0b00,
            root
        ));
        assert!(verify_merkle_proof(
            leaf_b01,
            &[leaf_b00, node_b1x],
            2,
            0b01,
            root
        ));
        assert!(verify_merkle_proof(
            leaf_b10,
            &[leaf_b11, node_b0x],
            2,
            0b10,
            root
        ));
        assert!(verify_merkle_proof(
            leaf_b11,
            &[leaf_b10, node_b0x],
            2,
            0b11,
            root
        ));
        assert!(verify_merkle_proof(
            leaf_b11,
            &[leaf_b10],
            1,
            0b11,
            node_b1x
        ));

        // Ensure that incorrect proofs fail
        // Zero-length proof
        assert!(!verify_merkle_proof(leaf_b01, &[], 2, 0b01, root));
        // Proof in reverse order
        assert!(!verify_merkle_proof(
            leaf_b01,
            &[node_b1x, leaf_b00],
            2,
            0b01,
            root
        ));
        // Proof too short
        assert!(!verify_merkle_proof(leaf_b01, &[leaf_b00], 2, 0b01, root));
        // Wrong index
        assert!(!verify_merkle_proof(
            leaf_b01,
            &[leaf_b00, node_b1x],
            2,
            0b10,
            root
        ));
        // Wrong root
        assert!(!verify_merkle_proof(
            leaf_b01,
            &[leaf_b00, node_b1x],
            2,
            0b01,
            node_b1x
        ));
    }

    #[test]
    fn verify_zero_depth() {
        let leaf = H256::from([0xD6; 32]);
        let junk = H256::from([0xD7; 32]);
        assert!(verify_merkle_proof(leaf, &[], 0, 0, leaf));
        assert!(!verify_merkle_proof(leaf, &[], 0, 7, junk));
    }

    #[test]
    fn push_complete_example() {
        let depth = 2;
        let mut tree = MerkleTree::create(&[], depth);

        let leaf_b00 = H256::from([0xAA; 32]);

        let res = tree.push_leaf(leaf_b00, 0);
        assert_eq!(res, Err(MerkleTreeError::DepthTooSmall));
        let expected_tree = MerkleTree::create(&[], depth);
        assert_eq!(tree.hash(), expected_tree.hash());

        tree.push_leaf(leaf_b00, depth)
            .expect("Pushing in empty tree failed");
        let expected_tree = MerkleTree::create(&[leaf_b00], depth);
        assert_eq!(tree.hash(), expected_tree.hash());

        let leaf_b01 = H256::from([0xBB; 32]);
        tree.push_leaf(leaf_b01, depth)
            .expect("Pushing in left then right node failed");
        let expected_tree = MerkleTree::create(&[leaf_b00, leaf_b01], depth);
        assert_eq!(tree.hash(), expected_tree.hash());

        let leaf_b10 = H256::from([0xCC; 32]);
        tree.push_leaf(leaf_b10, depth)
            .expect("Pushing in right then left node failed");
        let expected_tree = MerkleTree::create(&[leaf_b00, leaf_b01, leaf_b10], depth);
        assert_eq!(tree.hash(), expected_tree.hash());

        let leaf_b11 = H256::from([0xDD; 32]);
        tree.push_leaf(leaf_b11, depth)
            .expect("Pushing in outtermost leaf failed");
        let expected_tree = MerkleTree::create(&[leaf_b00, leaf_b01, leaf_b10, leaf_b11], depth);
        assert_eq!(tree.hash(), expected_tree.hash());

        let leaf_b12 = H256::from([0xEE; 32]);
        let res = tree.push_leaf(leaf_b12, depth);
        assert_eq!(res, Err(MerkleTreeError::MerkleTreeFull));
        assert_eq!(tree.hash(), expected_tree.hash());
    }

    #[test]
    fn big_test() {
        let leaves: Vec<_> = (0..64).map(H256::from_low_u64_be).collect();

        let mut tree = MerkleTree::create(&[], 32);
        leaves.iter().for_each(|leaf| {
            tree.push_leaf(*leaf, 32).unwrap();
        });

        leaves.iter().enumerate().for_each(|(i, leaf)| {
            let (l, proof) = tree.generate_proof(i, 32);
            assert_eq!(l, *leaf);
            assert!(verify_merkle_proof(*leaf, &proof, 32, i, tree.hash()));
        });
    }

    #[test]
    fn it_correctly_calculate_zeroes() {
        ZERO_HASHES
            .iter()
            .zip(ZERO_NODES.iter())
            .take(TREE_DEPTH)
            .for_each(|(left, right)| {
                assert_eq!(*left, right.hash());
            });
    }

    #[test]
    fn it_is_compatible_with_incremental_merkle() {
        let leaf = H256::repeat_byte(1);

        let mut full = MerkleTree::create(&[], TREE_DEPTH);
        let mut incr = incremental::IncrementalMerkle::default();
        let second = MerkleTree::create(&[leaf], TREE_DEPTH);

        full.push_leaf(leaf, TREE_DEPTH).unwrap();
        incr.ingest(leaf);
        assert_eq!(second.hash(), incr.root());
        assert_eq!(full.hash(), incr.root());
    }
}

/*
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

   1. Definitions.

      "License" shall mean the terms and conditions for use, reproduction,
      and distribution as defined by Sections 1 through 9 of this document.

      "Licensor" shall mean the copyright owner or entity authorized by
      the copyright owner that is granting the License.

      "Legal Entity" shall mean the union of the acting entity and all
      other entities that control, are controlled by, or are under common
      control with that entity. For the purposes of this definition,
      "control" means (i) the power, direct or indirect, to cause the
      direction or management of such entity, whether by contract or
      otherwise, or (ii) ownership of fifty percent (50%) or more of the
      outstanding shares, or (iii) beneficial ownership of such entity.

      "You" (or "Your") shall mean an individual or Legal Entity
      exercising permissions granted by this License.

      "Source" form shall mean the preferred form for making modifications,
      including but not limited to software source code, documentation
      source, and configuration files.

      "Object" form shall mean any form resulting from mechanical
      transformation or translation of a Source form, including but
      not limited to compiled object code, generated documentation,
      and conversions to other media types.

      "Work" shall mean the work of authorship, whether in Source or
      Object form, made available under the License, as indicated by a
      copyright notice that is included in or attached to the work
      (an example is provided in the Appendix below).

      "Derivative Works" shall mean any work, whether in Source or Object
      form, that is based on (or derived from) the Work and for which the
      editorial revisions, annotations, elaborations, or other modifications
      represent, as a whole, an original work of authorship. For the purposes
      of this License, Derivative Works shall not include works that remain
      separable from, or merely link (or bind by name) to the interfaces of,
      the Work and Derivative Works thereof.

      "Contribution" shall mean any work of authorship, including
      the original version of the Work and any modifications or additions
      to that Work or Derivative Works thereof, that is intentionally
      submitted to Licensor for inclusion in the Work by the copyright owner
      or by an individual or Legal Entity authorized to submit on behalf of
      the copyright owner. For the purposes of this definition, "submitted"
      means any form of electronic, verbal, or written communication sent
      to the Licensor or its representatives, including but not limited to
      communication on electronic mailing lists, source code control systems,
      and issue tracking systems that are managed by, or on behalf of, the
      Licensor for the purpose of discussing and improving the Work, but
      excluding communication that is conspicuously marked or otherwise
      designated in writing by the copyright owner as "Not a Contribution."

      "Contributor" shall mean Licensor and any individual or Legal Entity
      on behalf of whom a Contribution has been received by Licensor and
      subsequently incorporated within the Work.

   2. Grant of Copyright License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      copyright license to reproduce, prepare Derivative Works of,
      publicly display, publicly perform, sublicense, and distribute the
      Work and such Derivative Works in Source or Object form.

   3. Grant of Patent License. Subject to the terms and conditions of
      this License, each Contributor hereby grants to You a perpetual,
      worldwide, non-exclusive, no-charge, royalty-free, irrevocable
      (except as stated in this section) patent license to make, have made,
      use, offer to sell, sell, import, and otherwise transfer the Work,
      where such license applies only to those patent claims licensable
      by such Contributor that are necessarily infringed by their
      Contribution(s) alone or by combination of their Contribution(s)
      with the Work to which such Contribution(s) was submitted. If You
      institute patent litigation against any entity (including a
      cross-claim or counterclaim in a lawsuit) alleging that the Work
      or a Contribution incorporated within the Work constitutes direct
      or contributory patent infringement, then any patent licenses
      granted to You under this License for that Work shall terminate
      as of the date such litigation is filed.

   4. Redistribution. You may reproduce and distribute copies of the
      Work or Derivative Works thereof in any medium, with or without
      modifications, and in Source or Object form, provided that You
      meet the following conditions:

      (a) You must give any other recipients of the Work or
          Derivative Works a copy of this License; and

      (b) You must cause any modified files to carry prominent notices
          stating that You changed the files; and

      (c) You must retain, in the Source form of any Derivative Works
          that You distribute, all copyright, patent, trademark, and
          attribution notices from the Source form of the Work,
          excluding those notices that do not pertain to any part of
          the Derivative Works; and

      (d) If the Work includes a "NOTICE" text file as part of its
          distribution, then any Derivative Works that You distribute must
          include a readable copy of the attribution notices contained
          within such NOTICE file, excluding those notices that do not
          pertain to any part of the Derivative Works, in at least one
          of the following places: within a NOTICE text file distributed
          as part of the Derivative Works; within the Source form or
          documentation, if provided along with the Derivative Works; or,
          within a display generated by the Derivative Works, if and
          wherever such third-party notices normally appear. The contents
          of the NOTICE file are for informational purposes only and
          do not modify the License. You may add Your own attribution
          notices within Derivative Works that You distribute, alongside
          or as an addendum to the NOTICE text from the Work, provided
          that such additional attribution notices cannot be construed
          as modifying the License.

      You may add Your own copyright statement to Your modifications and
      may provide additional or different license terms and conditions
      for use, reproduction, or distribution of Your modifications, or
      for any such Derivative Works as a whole, provided Your use,
      reproduction, and distribution of the Work otherwise complies with
      the conditions stated in this License.

   5. Submission of Contributions. Unless You explicitly state otherwise,
      any Contribution intentionally submitted for inclusion in the Work
      by You to the Licensor shall be under the terms and conditions of
      this License, without any additional terms or conditions.
      Notwithstanding the above, nothing herein shall supersede or modify
      the terms of any separate license agreement you may have executed
      with Licensor regarding such Contributions.

   6. Trademarks. This License does not grant permission to use the trade
      names, trademarks, service marks, or product names of the Licensor,
      except as required for reasonable and customary use in describing the
      origin of the Work and reproducing the content of the NOTICE file.

   7. Disclaimer of Warranty. Unless required by applicable law or
      agreed to in writing, Licensor provides the Work (and each
      Contributor provides its Contributions) on an "AS IS" BASIS,
      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
      implied, including, without limitation, any warranties or conditions
      of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
      PARTICULAR PURPOSE. You are solely responsible for determining the
      appropriateness of using or redistributing the Work and assume any
      risks associated with Your exercise of permissions under this License.

   8. Limitation of Liability. In no event and under no legal theory,
      whether in tort (including negligence), contract, or otherwise,
      unless required by applicable law (such as deliberate and grossly
      negligent acts) or agreed to in writing, shall any Contributor be
      liable to You for damages, including any direct, indirect, special,
      incidental, or consequential damages of any character arising as a
      result of this License or out of the use or inability to use the
      Work (including but not limited to damages for loss of goodwill,
      work stoppage, computer failure or malfunction, or any and all
      other commercial damages or losses), even if such Contributor
      has been advised of the possibility of such damages.

   9. Accepting Warranty or Additional Liability. While redistributing
      the Work or Derivative Works thereof, You may choose to offer,
      and charge a fee for, acceptance of support, warranty, indemnity,
      or other liability obligations and/or rights consistent with this
      License. However, in accepting such obligations, You may act only
      on Your own behalf and on Your sole responsibility, not on behalf
      of any other Contributor, and only if You agree to indemnify,
      defend, and hold each Contributor harmless for any liability
      incurred by, or claims asserted against, such Contributor by reason
      of your accepting any such warranty or additional liability.

   END OF TERMS AND CONDITIONS

   APPENDIX: How to apply the Apache License to your work.

      To apply the Apache License to your work, attach the following
      boilerplate notice, with the fields enclosed by brackets "[]"
      replaced with your own identifying information. (Don't include
      the brackets!)  The text should be enclosed in the appropriate
      comment syntax for the file format. We also recommend that a
      file or class name and description of purpose be included on the
      same "printed page" as the copyright notice for easier
      identification within third-party archives.

   Copyright 2018 Sigma Prime Pty Ltd

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

const { ethers } = require('hardhat');
const { expect } = require('chai');

const { testCases } = require('./merkleTestCases.json');

describe('Merkle', async () => {
  for (let testCase of testCases) {
    const { testName, leaves, expectedRoot, proofs } = testCase;

    describe(testName, async () => {
      let merkle, root;

      before(async () => {
        const Merkle = await ethers.getContractFactory('TestMerkle');
        merkle = await Merkle.deploy();
        await merkle.deployed();

        //insert the leaves
        for (let leaf of leaves) {
          const leafHash = ethers.utils.hashMessage(leaf);
          await merkle.insert(leafHash);
        }
      });

      it('returns the correct leaf count', async () => {
        const leafCount = await merkle.count();
        expect(leafCount).to.equal(leaves.length);
      });

      it('produces the proper root', async () => {
        root = await merkle.root();
        expect(root).to.equal(expectedRoot);
      });

      it("can verify the leaves' proofs", async () => {
        for (let proof of proofs) {
          const { leaf, path, index } = proof;

          const proofRoot = await merkle.branchRoot(leaf, path, index);
          expect(proofRoot).to.equal(root);
        }
      });
    });
  }
});

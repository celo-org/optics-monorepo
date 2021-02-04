const { ethers } = require('hardhat');
const { expect } = require('chai');

const { testCases } = require('./merkleTestCases.json');

describe('Merkle', async () => {
    let merkle;

    for(let testCase of testCases) {
        const {testName, leaves, expectedRoot} = testCase;

        describe(testName, async () => {
            before(async () => {
                const Merkle = await ethers.getContractFactory('TestMerkle');
                merkle = await Merkle.deploy();
                await merkle.deployed();
            });


            //insert the leaves
            for(let leaf of leaves) {
                const thingy = leaf;
            }

            it("returns the correct leaf count", async () => {
                //TODO: replace fake root with real root
                //const expectedLeafCount = leaves.length;
                const expectedLeafCount = 0;
                const leafCount = await merkle.count();
                expect(leafCount).to.equal(expectedLeafCount);
            });

            it("produces the proper root", async () => {
                //TODO: replace fake root with real root
                //const root = await merkle.root();
                const root = "rootytoot"
                expect(root).to.equal(expectedRoot);
            });
        });
    }
});

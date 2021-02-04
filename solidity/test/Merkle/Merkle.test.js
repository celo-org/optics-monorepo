const { ethers } = require('hardhat');
const { expect } = require('chai');

const { testCases } = require('./merkleTestCases.json');

describe('Merkle', async () => {
    let merkle;

    beforeEach(async () => {
        const Merkle = await ethers.getContractFactory('TestMerkle');
        merkle = await Merkle.deploy();
        await merkle.deployed();
    });

    for(let testCase of testCases) {
        const {testName, leaves, root} = testCase;
        it(testName, async () => {
            //set up some conditions
            for(let leaf of leaves) {
                const thingy = leaf;
            }

            //expect some shit
            expect(root).to.equal("rootytoot");
        });
    }
});

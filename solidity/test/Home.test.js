const { waffle, ethers } = require('hardhat');
const { provider, deployMockContract } = waffle;
const { expect } = require('chai');

const NoSortition = require('../artifacts/contracts/Sortition.sol/NoSortition.json');
const ACTIVE = 0;
const FAILED = 1;

describe('Home', async () => {
    let sortition;
    let home;
    const originSLIP44 = 1234;
    
    let [signer] = provider.getWallets();
    let updater = new optics.Updater(signer, originSLIP44);

      beforeEach(async () => {      
        const mockSortition = await deployMockContract(signer, NoSortition.abi);
        await mockSortition.mock.current.returns(signer.address);
        await mockSortition.mock.slash.returns();

        const Home = await ethers.getContractFactory('TestHome');
        home = await Home.deploy(originSLIP44, mockSortition.address);
        await home.deployed();
      });

      it('Halts on fail', async () => {
        await home.setFailed();
        
        const state = await home.state();
        expect(state).to.equal(FAILED);

        const recipient = ethers.utils.formatBytes32String("recipient");
        const message = ethers.utils.formatBytes32String("message");
        await expect(home.enqueue(originSLIP44, recipient, message)).to.be.revertedWith('Failed state');
      });

      it('Accepts an update', async () => {
        const recipient = ethers.utils.formatBytes32String("recipient");
        const message = ethers.utils.formatBytes32String("message");
        await home.enqueue(originSLIP44, recipient, message);

        const [oldRoot, newRoot] = await home.suggestUpdate();
        const { signature } = await updater.signUpdate(oldRoot, newRoot);
        await expect(home.update(oldRoot, newRoot, signature))
          .to.emit(home, 'Update')
          .withArgs(originSLIP44, oldRoot, newRoot, signature);
      });

      it('Accepts and fails on valid double update proofs', async () => {});
});

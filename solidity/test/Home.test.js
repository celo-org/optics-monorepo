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
        expect(await home.state()).to.equal(FAILED);

        const recipient = ethers.utils.formatBytes32String("recipient");
        const message = ethers.utils.formatBytes32String("message");
        await expect(home.enqueue(originSLIP44, recipient, message))
          .to.be.revertedWith('Failed state');
      });

      it('Accepts a valid update', async () => {
        const recipient = ethers.utils.formatBytes32String("recipient");
        const message = ethers.utils.formatBytes32String("message");
        await home.enqueue(originSLIP44, recipient, message);

        const [oldRoot, newRoot] = await home.suggestUpdate();
        const { signature } = await updater.signUpdate(oldRoot, newRoot);
        await expect(home.update(oldRoot, newRoot, signature))
          .to.emit(home, 'Update')
          .withArgs(originSLIP44, oldRoot, newRoot, signature);
      });

      it('Rejects update that does not build off the current root', async () => {
        const recipient = ethers.utils.formatBytes32String("recipient");
        const message = ethers.utils.formatBytes32String("message");
        const recipient2 = ethers.utils.formatBytes32String("recipient2");
        const message2 = ethers.utils.formatBytes32String("message2");

        await home.enqueue(originSLIP44, recipient, message);
        const [_firstRoot, secondRoot] = await home.suggestUpdate();
        await home.enqueue(originSLIP44, recipient2, message2);
        const [_secondRoot, thirdRoot] = await home.suggestUpdate();
        
        // Try to submit update that skips the current (first) root
        const { signature } = await updater.signUpdate(secondRoot, thirdRoot);
        await expect(home.update(secondRoot, thirdRoot, signature))
          .to.be.revertedWith('Not a current update');
      });

      it('Rejects update that does not exist in the queue', async () => {
        const recipient = ethers.utils.formatBytes32String("recipient");
        const message = ethers.utils.formatBytes32String("message");
        await home.enqueue(originSLIP44, recipient, message);
        
        const [oldRoot, _newRoot] = await home.suggestUpdate();
        const fakeNewRoot = ethers.utils.formatBytes32String("fake root"); // better way to create fake root?
        const { signature } = await updater.signUpdate(oldRoot, fakeNewRoot);
        await expect(home.update(oldRoot, fakeNewRoot, signature))
          .to.emit(home, 'ImproperUpdate')

        expect(await home.state()).to.equal(FAILED);
      });
});

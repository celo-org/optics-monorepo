const { waffle, ethers } = require('hardhat');
const { provider, deployMockContract } = waffle;
const { expect } = require('chai');
const NoSortition = require('../artifacts/contracts/Sortition.sol/NoSortition.json');

const ACTIVE = 0;
const FAILED = 1;

describe('Home', async () => {
    let home;
    const originSLIP44 = 1234;
    
    let [signer, fakeSigner] = provider.getWallets();
    let updater = new optics.Updater(signer, originSLIP44);
    const fakeUpdater = new optics.Updater(fakeSigner, originSLIP44);

    const enqueueMessageAndSuggestUpdate = async (message, recipient) => {
        message = ethers.utils.formatBytes32String(message);
        recipient = ethers.utils.formatBytes32String(recipient);
        await home.enqueue(originSLIP44, recipient, message);
        return await home.suggestUpdate();
    }

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
          .to.be.revertedWith('failed state');
      });

      it('Accepts a valid update', async () => {
        const [oldRoot, newRoot] = await enqueueMessageAndSuggestUpdate("message", "recipient");
        const { signature } = await updater.signUpdate(oldRoot, newRoot);
        await expect(home.update(oldRoot, newRoot, signature))
          .to.emit(home, 'Update')
          .withArgs(originSLIP44, oldRoot, newRoot, signature);
      });

      it('Rejects update that does not build off of current root', async () => {
        const [_firstRoot, secondRoot] = await enqueueMessageAndSuggestUpdate("message", "recipient");
        const [_, thirdRoot] = await enqueueMessageAndSuggestUpdate("message2", "recipient2");
        
        // Try to submit update that skips the current (first) root
        const { signature } = await updater.signUpdate(secondRoot, thirdRoot);
        await expect(home.update(secondRoot, thirdRoot, signature))
          .to.be.revertedWith('not a current update');
      });

      it('Rejects update that does not exist in queue', async () => {
        const [oldRoot, _newRoot] = await enqueueMessageAndSuggestUpdate("message", "recipient");
        const fakeNewRoot = ethers.utils.formatBytes32String("fake root"); // better way to create fake root?
        const { signature } = await updater.signUpdate(oldRoot, fakeNewRoot);
        await expect(home.update(oldRoot, fakeNewRoot, signature))
          .to.emit(home, 'ImproperUpdate');

        expect(await home.state()).to.equal(FAILED);
      });

      it('Rejects update from non-updater address', async () => {
        const [oldRoot, newRoot] = await enqueueMessageAndSuggestUpdate("message", "recipient");
        const { signature: fakeSignature } = await fakeUpdater.signUpdate(oldRoot, newRoot);
        await expect(home.update(oldRoot, newRoot, fakeSignature))
          .to.be.revertedWith("bad sig")
      });

      it('Fails on valid double update proof', async () => {
        const [firstRoot, secondRoot] = await enqueueMessageAndSuggestUpdate("message", "recipient");
        const [_secondRoot, thirdRoot] = await enqueueMessageAndSuggestUpdate("message2", "recipient2");
        const { signature } = await updater.signUpdate(firstRoot, secondRoot);
        const { signature: signature2 } = await updater.signUpdate(firstRoot, thirdRoot);

        await expect(home.doubleUpdate(
          [firstRoot, firstRoot], 
          [secondRoot, thirdRoot], 
          signature, signature2
        )).to.emit(home, 'DoubleUpdate');

        expect(await home.state()).to.equal(FAILED);
      });
});

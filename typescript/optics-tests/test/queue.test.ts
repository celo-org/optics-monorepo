import { ethers } from 'hardhat';
import { expect } from 'chai';
import { TestQueue, TestQueue__factory } from '../../typechain/optics-core';

// create a proper hex encoded bytes32 filled with number. e.g 0x01010101...
const bytes32 = (num: number) => `0x${Buffer.alloc(32, num).toString('hex')}`;

describe('Queue', async () => {
  let queue: TestQueue;

  before(async () => {
    const [signer] = await ethers.getSigners();
    const queueFactory = new TestQueue__factory(signer);
    queue = await queueFactory.deploy();
  });

  it('should function as a queue', async () => {
    // we put this here for coverage to check that init properly does nothing
    await queue.initializeAgain();

    const items = Array.from(new Array(10).keys()).map((i) => bytes32(i));

    for (const [idx, item] of items.entries()) {
      await queue.enqueue(item);
      const length = await queue.length();
      expect(length).to.equal(idx + 1);
    }

    // last item
    const last = await queue.lastItem();
    expect(last).to.equal(items[items.length - 1]);

    // contains
    expect(await queue.contains(bytes32(3))).to.be.true;
    expect(await queue.contains(bytes32(0xff))).to.be.false;

    for (const [idx, item] of items.entries()) {
      // peek and dequeue
      const dequeued = await queue.peek();
      await queue.dequeue();
      expect(dequeued).to.equal(item);

      // length
      const length = await queue.length();
      expect(length).to.equal(items.length - idx - 1);
    }

    // reverts
    await expect(queue.dequeue()).to.be.revertedWith('Empty');
    await expect(queue.peek()).to.be.revertedWith('Empty');

    // Multi-enq
    await queue.enqueueMany(items);
    let length = await queue.length();
    expect(length).to.equal(items.length);

    // Multi-deq static call to check ret val
    let deqed = await queue.callStatic.dequeueMany(items.length);
    items.forEach((item, idx) => {
      expect(item).to.equal(deqed[idx]);
    });

    // Multi-deq that exceeds size reverts
    await expect(queue.dequeueMany(items.length + 1)).to.be.revertedWith(
      'Insufficient',
    );

    // Multi-deq tx to check function
    await queue.dequeueMany(items.length);
    length = await queue.length();
    expect(length).to.equal(0);
  });
});

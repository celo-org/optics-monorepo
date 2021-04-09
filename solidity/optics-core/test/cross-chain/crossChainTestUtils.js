const { expect } = require('chai');
const {
  getHome,
  getReplica,
  getUpdaterObject,
} = require('./deployCrossChainTest');

// // Helper function that enqueues message and returns its root.
// // The message recipient is the same for all messages enqueued.
async function enqueueMessageAndGetRootHome(
  chainDetails,
  latestRoot,
  message,
  originDomain,
  destinationDomain,
  recipientAddress,
) {
  const home = getHome(chainDetails, originDomain);

  message = ethers.utils.formatBytes32String(message);

  // Send message with random signer address as msg.sender
  await home.enqueue(
    destinationDomain,
    optics.ethersAddressToBytes32(recipientAddress),
    message,
  );

  const [, newRoot] = await home.suggestUpdate();

  latestRoot[originDomain] = newRoot;

  return newRoot;
}

async function enqueueMessagesAndUpdateHome(
  chainDetails,
  messages,
  originDomain,
  destinationDomain,
  recipientAddress,
  latestRoot,
  latestUpdate,
) {
  const home = getHome(chainDetails, originDomain);
  const updater = getUpdaterObject(chainDetails, originDomain);

  const startRoot = await home.current();

  // enqueue each message to Home and get the intermediate root
  const roots = [];
  for (let message of messages) {
    const newRoot = await enqueueMessageAndGetRootHome(
      chainDetails,
      latestRoot,
      message,
      originDomain,
      destinationDomain,
      recipientAddress,
    );
    roots.push(newRoot);
  }

  // ensure that Home queue contains
  // all of the roots we just enqueued
  for (let root of roots) {
    expect(await home.queueContains(root)).to.be.true;
  }

  // sign & submit an update from startRoot to finalRoot
  const finalRoot = latestRoot[originDomain];

  const { signature } = await updater.signUpdate(startRoot, finalRoot);

  latestUpdate[originDomain] = {
    startRoot,
    finalRoot,
    signature,
  };

  await expect(home.update(startRoot, finalRoot, signature))
    .to.emit(home, 'Update')
    .withArgs(originDomain, startRoot, finalRoot, signature);

  // ensure that Home root is now finalRoot
  expect(await home.current()).to.equal(finalRoot);

  // ensure that Home queue no longer contains
  // any of the roots we just enqueued -
  // they should be removed from queue when update is submitted
  for (let root of roots) {
    expect(await home.queueContains(root)).to.be.false;
  }

  return {
    latestRoot,
    latestUpdate,
  };
}

async function enqueueUpdateReplica(
  chainDetails,
  latestUpdate,
  originDomain,
  destinationDomain,
) {
  const replica = getReplica(chainDetails, destinationDomain, originDomain);

  const { startRoot, finalRoot, signature } = latestUpdate[originDomain];

  await expect(replica.update(startRoot, finalRoot, signature))
    .to.emit(replica, 'Update')
    .withArgs(originDomain, startRoot, finalRoot, signature);

  expect(await replica.queueEnd()).to.equal(finalRoot);

  return finalRoot;
}

module.exports = {
  enqueueUpdateReplica,
  enqueueMessagesAndUpdateHome,
};

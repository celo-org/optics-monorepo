const { expect } = require('chai');
const {
  getHome,
  getReplica,
  getUpdaterObject,
} = require('./deployCrossChainTest');

// // Helper function that enqueues message and returns its root.
// // The message recipient is the same for all messages enqueued.
/*
 *
 *
 * */
async function enqueueMessageAndGetRootHome(
  chainDetails,
  homeDomain,
  messageDetails,
) {
  const home = getHome(chainDetails, homeDomain);

  const { message, destinationDomain, recipientAddress } = messageDetails;

  // Send message with random signer address as msg.sender
  await home.enqueue(
    destinationDomain,
    optics.ethersAddressToBytes32(recipientAddress),
    ethers.utils.formatBytes32String(message),
  );

  const [, newRoot] = await home.suggestUpdate();

  return newRoot;
}

async function enqueueMessagesAndUpdateHome(
  chainDetails,
  homeDomain,
  messages,
) {
  const home = getHome(chainDetails, homeDomain);
  const updater = getUpdaterObject(chainDetails, homeDomain);

  const startRoot = await home.current();

  // enqueue each message to Home and get the intermediate root
  const enqueuedRoots = [];
  for (let message of messages) {
    const newRoot = await enqueueMessageAndGetRootHome(
      chainDetails,
      homeDomain,
      message,
    );

    enqueuedRoots.push(newRoot);
  }

  // ensure that Home queue contains
  // all of the roots we just enqueued
  for (let root of enqueuedRoots) {
    expect(await home.queueContains(root)).to.be.true;
  }

  // sign & submit an update from startRoot to finalRoot
  const finalRoot = enqueuedRoots[enqueuedRoots.length - 1];

  const { signature } = await updater.signUpdate(startRoot, finalRoot);

  await expect(home.update(startRoot, finalRoot, signature))
    .to.emit(home, 'Update')
    .withArgs(homeDomain, startRoot, finalRoot, signature);

  // ensure that Home root is now finalRoot
  expect(await home.current()).to.equal(finalRoot);

  // ensure that Home queue no longer contains
  // any of the roots we just enqueued -
  // they should be removed from queue when update is submitted
  for (let root of enqueuedRoots) {
    expect(await home.queueContains(root)).to.be.false;
  }

  return {
    startRoot,
    finalRoot,
    signature,
  };
}

async function enqueueUpdateReplica(
  chainDetails,
  latestUpdateOnOriginChain,
  originDomain,
  destinationDomain,
) {
  const replica = getReplica(chainDetails, destinationDomain, originDomain);

  const { startRoot, finalRoot, signature } = latestUpdateOnOriginChain;

  await expect(replica.update(startRoot, finalRoot, signature))
    .to.emit(replica, 'Update')
    .withArgs(originDomain, startRoot, finalRoot, signature);

  expect(await replica.queueEnd()).to.equal(finalRoot);

  return finalRoot;
}

function generateMessage(
  messageString,
  messageDestinationDomain,
  messageRecipient,
) {
  return {
    message: messageString,
    destinationDomain: messageDestinationDomain,
    recipientAddress: messageRecipient,
  };
}

module.exports = {
  enqueueUpdateReplica,
  enqueueMessagesAndUpdateHome,
  generateMessage,
};

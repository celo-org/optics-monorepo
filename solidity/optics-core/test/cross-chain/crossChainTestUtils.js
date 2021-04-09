const { expect } = require('chai');
const {
  getHome,
  getReplica,
  getUpdaterObject,
} = require('./deployCrossChainTest');

/*
 * Enqueue a message to the specified Home contract
 * and return the updated root
 *
 * @param chainDetails - ChainDetails type containing every deployed domain
 * @param homeDomain - domain of the Home contract to which we will enqueue the message
 * @param messageDetails - Message type containing
 *   the message string,
 *   the destination domain to which the message will be sent,
 *   the recipient address on the destination domain to which the message will be dispatched
 *
 * @return newRoot - bytes32 of the latest root
 */
async function enqueueMessageToHome(chainDetails, homeDomain, messageDetails) {
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

/*
 * Enqueue a set of messages to the specified Home contract,
 * then sign and submit an update to the Home contract
 *
 * @param chainDetails - ChainDetails type containing every deployed domain
 * @param homeDomain - domain of the Home contract to which we will enqueue all of messages / submit the update
 * @param messages - Message[]
 *
 * @return update - Update type
 */
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
    const newRoot = await enqueueMessageToHome(
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

  const update = {
    startRoot,
    finalRoot,
    signature,
  };

  return update;
}

/*
 * Enqueue a signed update to the Replica contract
 *
 * @param chainDetails - ChainDetails type containing every deployed domain
 * @param latestUpdateOnOriginChain - Update type, the last Update submitted to the Home chain for this Replica
 * @param homeDomain - domain of the Home contract from which the update originated
 * @param replicaDomain - domain of the Replica contract where the update will be submitted
 *
 * @return finalRoot - updated state root enqueued to the Replica
 */
async function enqueueUpdateToReplica(
  chainDetails,
  latestUpdateOnOriginChain,
  homeDomain,
  replicaDomain,
) {
  const replica = getReplica(chainDetails, replicaDomain, homeDomain);

  const { startRoot, finalRoot, signature } = latestUpdateOnOriginChain;

  await expect(replica.update(startRoot, finalRoot, signature))
    .to.emit(replica, 'Update')
    .withArgs(homeDomain, startRoot, finalRoot, signature);

  expect(await replica.queueEnd()).to.equal(finalRoot);

  return finalRoot;
}

/*
 * Format into a Message type
 *
 * @param messageString - string for the body of the message
 * @param messageDestinationDomain - domain where the message will be sent
 * @param messageRecipient - recipient of the message on the destination domain
 *
 * @return message - Message type
 */
function formatMessage(
  messageString,
  messageDestinationDomain,
  messageRecipient,
) {
  const message = {
    message: messageString,
    destinationDomain: messageDestinationDomain,
    recipientAddress: messageRecipient,
  };

  return message;
}

module.exports = {
  enqueueUpdateToReplica,
  enqueueMessagesAndUpdateHome,
  formatMessage,
};

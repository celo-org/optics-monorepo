import { expect } from 'chai';
import { ethers, optics } from 'hardhat';
import * as types from 'ethers';

import { Updater } from '../../lib/core';
import { Update, CallData, Address } from '../../lib/types';
import {
  Replica,
  TestReplica,
  Home,
  TestGovernanceRouter,
} from '../../../typechain/optics-core';

type MessageDetails = {
  message: string;
  destinationDomain: number;
  recipientAddress: Address;
};

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
export async function enqueueMessageToHome(
  home: Home,
  messageDetails: MessageDetails,
): Promise<string> {
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
export async function enqueueMessagesAndUpdateHome(
  home: Home,
  messages: MessageDetails[],
  updater: Updater,
): Promise<Update> {
  const homeDomain = await home.localDomain();

  const oldRoot = await home.current();

  // enqueue each message to Home and get the intermediate root
  const enqueuedRoots = [];
  for (let message of messages) {
    const newRoot = await enqueueMessageToHome(home, message);

    enqueuedRoots.push(newRoot);
  }

  // ensure that Home queue contains
  // all of the roots we just enqueued
  for (let root of enqueuedRoots) {
    expect(await home.queueContains(root)).to.be.true;
  }

  // sign & submit an update from oldRoot to newRoot
  const newRoot = enqueuedRoots[enqueuedRoots.length - 1];

  const { signature } = await updater.signUpdate(oldRoot, newRoot);

  await expect(home.update(oldRoot, newRoot, signature))
    .to.emit(home, 'Update')
    .withArgs(homeDomain, oldRoot, newRoot, signature);

  // ensure that Home root is now newRoot
  expect(await home.current()).to.equal(newRoot);

  // ensure that Home queue no longer contains
  // any of the roots we just enqueued -
  // they should be removed from queue when update is submitted
  for (let root of enqueuedRoots) {
    expect(await home.queueContains(root)).to.be.false;
  }

  return {
    oldRoot,
    newRoot,
    signature,
  };
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
export async function enqueueUpdateToReplica(
  latestUpdateOnOriginChain: Update,
  replica: Replica,
): Promise<string> {
  const homeDomain = await replica.remoteDomain();
  const { oldRoot, newRoot, signature } = latestUpdateOnOriginChain;

  await expect(replica.update(oldRoot, newRoot, signature))
    .to.emit(replica, 'Update')
    .withArgs(homeDomain, oldRoot, newRoot, signature);

  expect(await replica.queueEnd()).to.equal(newRoot);

  return newRoot;
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
export function formatMessage(
  message: string,
  destinationDomain: number,
  recipientAddress: Address,
): MessageDetails {
  return {
    message,
    destinationDomain,
    recipientAddress,
  };
}

export async function formatOpticsMessage(
  replica: TestReplica,
  governorRouter: TestGovernanceRouter,
  destinationRouter: TestGovernanceRouter,
  message: string,
): Promise<string> {
  const sequence = await replica.nextToProcess();
  const governorDomain = await governorRouter.localDomain();
  const destinationDomain = await destinationRouter.localDomain();

  // Create Optics message that is sent from the governor domain and governor
  // to the nonGovernorRouter on the nonGovernorDomain
  const opticsMessage = optics.formatMessage(
    governorDomain,
    governorRouter.address,
    sequence,
    destinationDomain,
    destinationRouter.address,
    message,
  );

  // Set message status to MessageStatus.Pending
  await replica.setMessagePending(opticsMessage);

  return opticsMessage;
}

export async function formatCall(
  destinationContract: types.Contract,
  functionStr: string,
  functionArgs: any[],
): Promise<CallData> {
  // Set up data for call message
  const callFunc = destinationContract.interface.getFunction(functionStr);
  const callDataEncoded = destinationContract.interface.encodeFunctionData(
    callFunc,
    functionArgs,
  );

  return {
    to: optics.ethersAddressToBytes32(destinationContract.address),
    data: callDataEncoded,
  };
}

// Send a transaction from the specified signer
export async function sendFromSigner(
  signer: types.Signer,
  contract: types.Contract,
  functionName: string,
  args: any[],
) {
  const data = encodeData(contract, functionName, args);

  return signer.sendTransaction({
    to: contract.address,
    data,
  });
}

function encodeData(
  contract: types.Contract,
  functionName: string,
  args: any[],
): string {
  const func = contract.interface.getFunction(functionName);
  return contract.interface.encodeFunctionData(func, args);
}

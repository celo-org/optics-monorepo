async function reportTxOutcome(tx, confs) {
  confs = confs ? confs : 1;
  console.log(`\tSent tx with ID ${tx.hash} to ${tx.to}`);
  console.log(`\tWaiting for ${confs} confs`);

  return await tx.wait(confs);
}

// turn a tightly packed proof into an array
async function parseProof(rawProof) {
  return ethers.utils.defaultAbiCoder.decode(['bytes32[32]'], rawProof);
}

async function validateUpdate(oldRoot, newRoot, signature, domain) {
  if (!ethers.utils.isHexString(oldRoot, 32)) {
    throw new Error('oldRoot must be a 32-byte 0x prefixed hex string');
  }
  if (!ethers.utils.isHexString(newRoot, 32)) {
    throw new Error('newRoot must be a 32-byte 0x prefixed hex string');
  }
  if (!ethers.utils.isHexString(signature, 65)) {
    throw new Error('signature must be a 65-byte 0x prefixed hex string');
  }

  if (domain) {
    // TODO: validate the signature
  }

  return {
    oldRoot,
    newRoot,
    signature,
  };
}

module.exports = {
  reportTxOutcome,
  parseProof,
  validateUpdate,
};

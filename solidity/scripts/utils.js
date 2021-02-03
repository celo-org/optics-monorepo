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

module.exports = {
  reportTxOutcome,
  parseProof,
};

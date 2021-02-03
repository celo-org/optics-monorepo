async function reportTxOutcome(tx, confs) {
  confs = confs ? confs : 1;
  console.log(`\tSent tx with ID ${tx.hash} to ${tx.to}`);
  console.log(`\tWaiting for ${confs} confs`);

  return await tx.wait(confs);
}

module.exports = {
  reportTxOutcome,
};

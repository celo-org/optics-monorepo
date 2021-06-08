/*
 * see also ../../js/types.js
 *
 * TestChainConfig {
 *      ...ChainConfig,
 *      updaterObject: optics.Updater type,
 *      signer: ethers Signer,
 *      contracts: OpticsContracts,
 * };
 *
 * ChainDetails {
 *   [domain]: TestChainConfig,
 * };
 *
 * Message {
 *      message: string,
 *      destinationDomain: int,
 *      recipientAddress: address,
 * };
 *
 * Update {
 *      startRoot: bytes32,
 *      finalRoot: bytes32,
 *      signature: hex,
 * }
 */

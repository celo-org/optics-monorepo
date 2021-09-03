# Frequently Asked Questions

-------

**Q: What is the point of the Updater’s attestations?? Why are they necessary / helpful?**

I am confused, because it seems like the Updater has very little discretion as to what messages should or should not be enqueued.. it has to sign a message that’s been added to the Home contract’s queue, and it can’t sign the most recent messages without also signing every message before it, so if it detects some kind of “invalid” or malicious message, the only optionality it has is to stop attesting to messages altogether, thereby halting the system entirely, right?

the updates to the state root are already calculated on-chain each time a message is Dispatched.. why can’t the Home contract just update the current state each time a message is Dispatched, not needing to bother with enqueuing intermediate state roots and waiting for an update to attest to the current state?

**A:**

the updater should have very little discretion. their job is to be a notary and to rubber-stamp something that has already objectively occurred. The Updater should sign roots regardless of the message content. There’s no concept of malicious or fraudulent messages on the Home chain. If someone calls `enqueue` on the Home contract, they want that message to be dispatched and the Updater should have little power to prevent thatThe Updater’s role isn’t to filter messages or worry about them at all. It’s to produce an `Update` that is cheap for all replicas and off-chain observers to verify, and to post a bond that can be slashed. The Replicas **cannot** read the Home’s `current`. They **require** the signed update from a known party in order to know that fraudulent `Update`s are expensive.

The reason for the Root Queue is to prevent the Updater from being slashed due to timing errors outside her control. What if the root changes while the signed Update transaction is in the transaction pool? If Home stored only the latest root, it might change after the signature is made, but before the TX is processed, resulting in slashing an honest Updater

- The updater does not need a copy of the tree
- The updater polls the `suggestUpdate` mechanism on the Home to get a valid update
- The updater does not update a local tree and attest the match
- The updater (and everyone else) can assume the Home calculated the tree root correctly

So, the purpose of the Updater is simply providing a signature that the Replica chains can verify. The Replica chains know that if they can verify the Updater’s signature on a new root, that it is the truth of what happened on the Home chain — or else the Updater will lose their bonded stake on the Home chain.

-------

**Q: does the Updater need to**

- maintain an off-chain copy of the sparse merkle tree
  - No, it relies on the contract
- parse transactions submitted to the Home contract and Dispatch events emitted on-chain to learn about new messages
  - No. It only needs to poll `suggestUpdate`
- update its local copy of the merkle tree with these new messages
  - No, it relies on the contract
- calculate the tree root of its local copy of the merkle tree
  - No, it relies on the contract
- compare its locally calculated tree root to the one generated on-chain
  - No, it relies on the contract
- attest that the two match?
  - No, it relies on the contract

I am definitely missing some insight into what function the Updater serves in the system

- It simply attests to the tree that the contract produced

-------

**Q: How does a message get processed?**

**A:**

1. Enqueue on [Home](https://github.com/celo-org/optics-monorepo/blob/main/solidity/optics-core/contracts/Home.sol)
2. Updater attests
3. Relayer relays the attestation
4. Processor submits the proof and the message
5. Replica [dispatches message](https://github.com/celo-org/optics-monorepo/blob/main/solidity/optics-core/contracts/Replica.sol#L202-L239) to the recipient contract

-------

**Q: What happens if the Updater commits fraud?**

**A:**

1. ****The watcher is able to detect fraud

2. The watcher notifies the Home contract, which halts (and slash the Updater's bond)

3. The watcher warns the xApps of the fraudulent update by calling `unenrollReplica`

    - [link](https://github.com/celo-org/optics-monorepo/blob/main/solidity/optics-core/contracts/XAppConnectionManager.sol#L38-L42)

4. When the fraudulent message is received, the xApp rejects it, because the Replica has been unenrolled

-------

**Q: What happens if the Updater equivocates (signs 2 conflicting updates)?**

**A:**

1. The watcher is able to detect this
2. The watcher notifies the Home contract, which halts (and slash the Updater's bond)
3. The watcher notifies each Replica contract, which halts

-------

**Q: Why would an Updater submit a double update?**

**A:** The updater is trying to send different (fraudulent) inbound messages to 2 different chains. E.g the updater wants to move the same $100 to 2 different chains.

-------

**Q: If all double updates are fraud, why do we handle them separately?**

**A:** Because unlike regular fraud, a double update can be detected by all chains. So we can *certainly* defend against it everywhere. Since we have a strong defense against this type of fraud, we just ban it outright.

-------

**Q: What do each of the agents do?**

**A:** See [Optics Architecture](./architecture.md)

-------

**Q: How do xApps know what channels to listen to? And which Home to send messages to?**

**A:** xApps "know" both of these things by querying the xAppConnectionManager.

The xAppConnectionManager is a contract that stores a registry of the address of the Home contract and the Replica contracts on the local chain. xApps query this information from the xAppConnectionManager.

When an external contract attempts to trigger a xApp, it queries the xAppConnectionManager to ensure that the contract is a verified Replica - this way, the xApp "knows" that the message is coming from Optics (rather than a malicious smart contract fabricating Optics messages).

When a xApp needs to send a message via Optics, it queries the xAppConnectionManager to get the address of the Home contract, where it will send the message.

The xAppConnectionManager's registry is maintained by permissioned agents in the Optics system. Enrolling new Replicas or changing the Home address must be done by Optics Governance; Un-enrolling Replicas is performed by either Governance or a permissioned role called a Watcher.

Watchers are permissioned for specific chains, and responsible for "watching" for fraud on the Home contract of that chain. If fraud occurs on the Home, the Watcher must sign a message attesting to the fraud, which can be submitted to the xAppConnectionManager to un-enroll the Replica. In this way, xApps no longer accept messages from Replicas whose Home contracts have been proven fraudulent.

In the future, Watchers will be bonded on the Home chain that they watch, to incentivize timely and consistent submission of their signature if fraud occurs, thereby reducing the trust that must be placed in the Watcher.

-------

**Q: What is a domain? Why do use domain numbers everywhere?**

**A:** The domain is an identifier for a chain (or other execution environment). It is a number, and eventually we'll have a registry for these. We tag each message with an origin domain so that the recipient knows where it came from. And a destination domain so that the relayer and processor know where to deliver it to (and so the Replica knows that it ought to deliver it). This also lets contracts permission specific people or contracts from other chains.

-------

**Q: Why do we use 32-byte addresses instead of Ethereum-style 20-byte addresses?**

**A:** This is future-proofing. We want to go to non-EVM chains in the future. And 20-bytes won't be enough there.

-------

**Q: Why put all messages in the same Home? Why not use a different Home per destination chain?**

**A:** We do this so that there's no action on the Home chain when we set up a new Replica. There's no action needed in the Home or on the home chain to make a new channel. The Home can be totally naive of the channels it's sending over

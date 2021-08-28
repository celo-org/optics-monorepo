# Optics: OPTimistic Interchain Communication

## What is Optics?

Optics is a new design for radically cheaper cross-chain communication *without header verification.* We expect operating Optics to cut 90% of costs compared to a traditional header relay.

Optics will form the base layer of a cross-chain communication network that provides fast, cheap communication for all smart contract chains, rollups, etc. It relies only on widely-available cryptographic primitives (unlike header relays), has latency around 2-3 hours (unlike an ORU message passing layer), and imposes only about 120,000 gas overhead on message senders.

Optics has been designed for ease of implementation in any blockchain that supports user-defined computations. We will provide initial Solidity implementations of the on-chain contracts, and Rust implementations of the off-chain system agents.

## How does it work?

Optics is patterned after optimistic systems. It sees an attestation of some data, and accepts it as valid after a timer elapses. While the timer is running, honest participants have a chance to respond to the data and/or submit fraud proofs.

Unlike most optimistic systems, Optics must work on multiple chains. This means that certain types of fraud can't be objectively proven on the receiving chain. For example, it can't know which messages the home chain intended to send and therefore can't check message validity. 

However, they can be proven on the home chain, which means participants can be bonded and fraudulent messages can always result in slashing. In addition, all off-chain observers can be immediately convinced of fraud (as they can check the home chain). This means that the validity of a message sent by Optics is not 100% guaranteed. Instead, Optics guarantees the following:

1) Fraud is costly

2) All users can learn about fraud

3) All users can respond to the fraudulent message before it is accepted

In other words, rather than using a globally verifiable fraud proof, Optics relies on local verification by participants. This tradeoff allows Optics to save 90% on gas fees compared to pessimistic relays, while still maintaining a high degree of security.

## Building Intuition

Optics works something like a notary service. The home chain produces a document (the message tree) that needs notarization. A notary (the updater) is contracted to sign it. The notary can produce a fraudulent copy, but they will be punished by having their bond and license publicly revoked. When this happens, everyone relying on the notary learns that the notary is malicious. All the notary's customers can immediately block the notary and prevent any malicious access to their accounts.

## Technical description

Optics creates an authenticated data structure on a home chain, and replays updates to that data structure on any number of replicas. As a result, the home chain and all replicas will agree on the state of the data structure. By embedding data ("messages") in this data structure we can propagate it between chains with a high degree of confidence.

The home chain enforces rules on the creation of this data structure. In the current design, this data structure is a sparse merkle tree based on the design used in the eth2 deposit contract. This tree commits to the vector of all previous messages. The home chain enforces an addressing and message scheme for messages and calculates the tree root. This root will be propagated to the replicas. The home chain maintains a queue of roots (one for each message).

The home chain elects an "updater" that must attest to the state of the message tree. The updater places a bond on the home chain and is required to periodically sign attestations (updates or `U`). Each attestation contains the root from the previous attestation (`U_prev`), and a new root (`U_new)`. 

The home chain slashes when it sees two conflicting updates (`U_i` and `U_i'` where `U_i_prev == U_i'_prev && U_i_new != U_i'_new`) or a single update where `U_new` is not an element of the queue. The new root MUST be a member of the queue. E.g a list of updates `U_1...U_i` should follow the form `[(A, B), (B, C), (C, D)...]`.  

Semantically, updates represent a batch commitment to the messages between the two roots. Updates contain one or more messages that ought to be propagated to the replica chain. Updates may occur at any frequency, as often as once per message. Because updates are chain-independent, any home chain update may be presented to any replica. And any replica update may be presented to the home chain. In other words, data availability of signed updates is guaranteed by each chain.

Before accepting an update, a replica places it into a queue of pending updates. Each update must wait for some time parameter before being accepted. While a replica can't know that an update is certainly valid, the waiting system guarantees that fraud is publicly visible **on the home chain** before being accepted by the replica. In other words, the security guarantee of the system is that all frauds may be published by any participant, all published frauds may be slashed, and all participants have a window to react to any fraud. Therefore updates that are **not** blacklisted by participants are sufficiently trustworthy for the replica to accept.
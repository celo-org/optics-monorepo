# Optics

OPTimistic Interchain Communication

## Overview

Optics is a cross-chain communication system. It handles passing raw buffers
between blockchains cheaply, and with minimal fuss. Like IBC and other
cross-chain communication systems, Optics creates channels between chains, and
then passes its messages over the channel. Once a channel is established, any
application on the chain can use it to send messages to any other chain.

Compared to IBC and PoS light client based cross-chain communication, Optics
has weaker security guarantees, and a longer latency period. However, Optics
may be implemented on any smart contract chain, with no bespoke light client
engineering. Because it does not run a light client, Optics does not spend
extra gas verifying remote chain block headers.

In other words, Optics is designed to prioritize:

- Cost: No header verification or state management.
- Speed of implementation: Requires only simple smart contracts, no complex
  cryptography.
- Ease of use: Simple interface for maintaining XApp connections.

You can read more about Optics' architecture [at Celo's main documentation site](https://docs.celo.org/celo-codebase/protocol/optics).

## Integrating with Optics

Optics establishes communication channels with other chains, but it's up to XApp (pronounced "zap", and short for "cross-chain applications")
developers to use those. This repo provides a standard pattern for integrating
Optics channels, and ensuring that communication is safe and secure.

Integrations require a few key components:

- A `Home` and any number of `Replica` contracts deployed on the chain already.
  These contracts manage Optics communication channels. and will be used by the
  XApp to send and receive messages.

- A `XAppConnectionManager` (in `solidity/optics-core/contracts`). This
  contract connects the XApp to Optics by allowing the XApp admin to enroll new
  `Home` and `Replica` contracts. Enrolling and unenrolling channels is the
  primary way to ensure that your XApp handles messages correctly. XApps may
  deploy their own connection manager, or share one with other XApps.

- A `Message` library. Optics sends raw byte arrays between chains. The XApp
  must define a message specification that can be serialized for sending, and
  deserialized for handling on the remote chain

- A `Router` contract. The router translates between the Optics cross-chain
  message format, and the local chain's call contract. It also implements the
  business logic of the XApp. It exposes the user-facing interface, handles
  messages coming in from other chains, and dispatches messages being sent to
  other chains.

Solidity developers interested in implementing their own `Message` library and
`Router` contract should check out the [optics-xapps](https://github.com/celo-org/optics-monorepo/tree/main/solidity/optics-xapps)
package. It contains several example XApps.

You can find current testnet deploy configurations in the `rust/config/`
directory. These deployments happen frequently and are unstable. Please feel
free to try out integrations using the deployed contracts in the LATEST config.

It is **Strongly Recommended** that XApp admins run a `watcher` daemon to
maintain their `XAppConnectionManager` and guard from fraud. Please see the
documentation in the `rust/` directory and the
[Optics architecture documentation](https://docs.celo.org/celo-codebase/protocol/optics)
for more details.

## Working on Optics

### Commit signature verification

Commits (and tags) for this repo require [signature verification](https://docs.github.com/en/github/authenticating-to-github/managing-commit-signature-verification/about-commit-signature-verification). If you'd like to contribute to Optics, make sure that your commits are signed locally.

### Pre-commit hooks

Set up your pre-commit hook:

```bash
echo "./pre-commit.sh" > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

Note: In the event you need to bypass the pre-commit hooks, pass the
`--no-verify` flag to your `git commit` command

### Solidity

1. Install dependencies

   ```bash
   cd solidity/optics-core
   npm i
   cd ../optics-xapps
   npm i
   ```
   
2. Setup your `.env` files
   ```bash
   cd typescript/optics-deploy
   touch .env && cat .env.example > .env
   cd ../../solidity/optics-core
   touch .env && cat .env.example > .env
   cd ../optics-xapps
   touch .env && cat .env.example > .env
   ```
   Then, add values to the keys in the newly created `.env` files.

3. Install jq

   ```bash
   brew install jq
   ```

   &nbsp; OR &nbsp;

   ```bash
   sudo apt-get install jq
   ```

4. Install solhint

   ```bash
   npm install -g solhint
   // to check it is installed:
   solhint --version
   ```

### Rust

- install [`rustup`](https://rustup.rs)
- see `rust/README.md`

#### Building Agent Images

There exists a docker build for the agent binaries. These docker images are used for deploying the agents in a production environment. 

```
$ cd rust
$ ./build.sh <image_tag>
$ ./release.sh <image_tag>
```

# What is Optics?

We present Optics - a system for sending messages between consensus systems
without paying header validation costs by creating the illusion of cross-chain
communication. Similar to an atomic swap, Optics uses non-global protocol
validation to simulate cross-chain communication. Optics can carry arbitrary
messages (raw byte vectors), uses a single-producer multi-consumer model, and
has protocol overhead sublinear in the number of messages being sent.

## Key Points

System sketch:

1. A "home" chain commits messages in a merkle tree
2. A bonded "updater" attests to the commitment
3. The home chain ensures the attestation is accurate, and slashes if not
4. Attested updates are replayed on any number of "replica" chains, after a
   time delay

As a result, one of the following is always true:

1. All replicas have a valid commitment to messages from the home chain
2. Failure was published before processing, and the updater can be slashed on
   the home chain

This guarantee, although weaker than header-chain validation, is still likely
acceptable for most applications.

## Summary

Optics is a new strategy for simulating cross-chain communication without
validating headers. The goal is to create a single short piece of state (a
32-byte hash) that can be updated regularly. This hash represents a merkle tree
containing a set of cross-chain messages being sent by a single chain (the
"home" chain for the Optics system). Contracts on the home chain can submit
messages, which are put into a merkle tree (the "message tree"). The message
tree's root may be transferred to any number of "replica" chains.

Rather than proving validity of the commitment, we put a delay on message
receipt, and ensure that failures are publicly visible. This ensures that
participants in the protocol have a chance to react to failures before the
failure can harm them. Which is to say, rather than preventing the inclusion of
bad messages, Optics guarantees that message recipients are aware of the
inclusion, and have a chance to refuse to process them.

To produce this effect, the home chain designates a single "updater." The
updater places a bond ensuring her good behavior. She is responsible for
producing signed attestations of the new message tree root. The home chain
accepts and validates these attestations. It ensures that they extend a
previous attestation, and contain a valid new root of the message set. These
attestations are then sent to each replica.

The replica accepts an update attestation signed by the updater, and puts it in
a pending state. After a timeout, it accepts the update from that attestation
and stores a new local root. Because this root contains a commitment of all
messages sent by the home chain, these messages can be proven (using the
replica's root) and then dispatched to contracts on the replica chain.

The timeout on new updates to the replica serves two purposes:

1. It ensures that any misbehavior by the updater is published **in advance**
   of message processing. This guarantees that data necessary for home chain
   slashing is available for all faults.
2. It gives message recipients a chance to opt-out of message processing for
   the update. If an incorrect update is published, recipients always have the
   information necessary to take defensive measures before any messages can be
   processed.

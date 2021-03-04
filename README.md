# Optics

OPTimistic Interchain Communication

## Setup

### Pre-commit hooks

```bash
echo "./pre-commit.sh" >> .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

Note: In the event you need to bypass the pre-commit hooks, pass `--no-verify` after commit message

### Solidity

1. Install dependencies

   ```bash
   cd solidity/optics-core
   npm i
   cd ../optics-bridge
   npm i
   ```

2. Install jq

   ```bash
   brew install jq
   ```

   &nbsp; OR &nbsp;

   ```bash
   sudo apt-get install jq
   ```

3. Install solhint

   ```bash
   npm install -g solhint
   // to check it is installed:
   solhint --version
   ```

### Rust

- install `rustup`
  - [link here](https://rustup.rs/)

## Abstract

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

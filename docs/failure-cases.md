# Optics Failure Cases

Optics is a robust system, resistant to all sorts of problems. However, there are a set of failure cases that require human intervention and need to be enumerated

## Agent State/Config

### Updater

- *Two `updater`s deployed with the same config*
  - (See Double Update)
- *Extended updater downtime*
  - **Effect:**
    - Updates stop being sent for a period of time
  - **Mitigation:**
    - `Updater` Rotation (not implemented)
- *Fraudulent `updater`*
  - **Effect:**
    - Invalid or fraudulent update is sent
  - **Mitigation:**
    - `Watcher` detects fraud, submits fraud proof (see Improper Update)

### Relayer

- *`relayer` "relays" the same update more than once*
  - **Effect:**
    - Only the first one works
    - Subsequent transactions are rejected by the replicas
  - **Mitigation:**
    - Mempool scanning
      - "is there a tx in the mempool already that does what I want to do?"

      If so, do nothing, pick another message to process.
    - __If minimizing gas use:__ Increase polling interval (check less often)

### Processor

- *`processor` "processes" the same message more than once*
  - **Effect:**
    - Only the first one works
    - Subsequent transactions are rejected by the smart contracts

### Watcher

- *Watcher and Fraudulent Updater Collude*
  - **Effect:**
    - Fraud is possible
  - **Mitigation:**
    - Distribute watcher operations to disparate entities. Anyone can run a watcher.

### General

- *Transaction Wallets Empty* 
  - **Effect:**
    - Transactions cease to be sent
  - **Mitigation:**
    - Monitor and top-up wallets on a regular basis

## Contract State

- *Double Update*
  - Happens if `Updater` (single key), submits two updates building off the "old root" with different "new root"
  - If two `updater`s were polling often but message volume was low, would likely result in the "same update" 
  - If two `updater`s were polling often but message volume was high, would likely result in a "double update" 
  - Doesn't necessarily need to be the __two updaters__, edge case could occur where the updater is submitting a transaction, crashes, and then reboots and submits a double update
  - **Effect:**
    - Home and Replicas go into a **Failed** state (stops working)
  - **Mitigation:**
    - Agent code has the ability to check its Database for a signed update, check whether it is going to submit a double update, and prevent itself from doing so
    - Need to improve things there
    - Updater wait time
      - `Updater` doesn't want to double-update, so it creates an update and sits on it for some interval. If still valid after the interval, submit. __(Reorg mitigation)__
    - __"Just don't run multiple updaters with the same config"__
- *Improper Update*
  - Should only occur if the chain has a "deep reorg" that is longer than the `Updater`'s __pause period__ OR if the `Updater` is actively committing fraud.
  - **Effect:**
    - `Home` goes into a **FAILED** state (stops working)
      - No plan for dealing with this currently
    - `Updater` gets slashed
      - (not implemented currently)
  - **Mitigation:**
    - `Watcher`(s) unenroll `xapps` 
    - Humans look at the situation, determine if the `Updater` was committing fraud or just the victim of poor consensus environment.

## Network Environment

- *Network Partition*
  - When multiple nodes split off on a fork and break consensus
  - Especially bad if the `updater` is off on the least-power chain (results in __Improper Update__)
  - **Effect:**
    - Manifests as a double-update
    - Manifests as an improper update
    - Messages simply stop
  - **Mitigation:**
    - Pay attention and be on the right fork
    - **Stop signing updates when this occurs!**
    - Have a reliable mechanism for determining this is happening and pull the kill-switch.
- *PoW Chain Reorg (See Network Partition)*
  - What happens when a __network partition__ ends
  - **Mitigation:**
- *PoS Chain Reorg (See Network Partition)*
  - Safety failure (BPs producing conflicting blocks)
  - Liveness Failure (no new blocks, chain stops finalizing new blocks)
  - **Effect:**
    - Slows down finality
    - Blocks stop being produced
  - How would this manifest in Celo?
    - Celo would stop producing blocks.
    - Agents would __pause__ and sit there
    - When agents see new blocks, they continue normal operations.

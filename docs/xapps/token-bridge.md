# Token Bridge xApp 

## Summary

The Token Bridge xApp implements a bridge that is capable of sending tokens across blockchains.

Features:

- Ensures that circulating token supply remains constant across all chains.

## Protocol

### Handling Messages

- the BridgeRouter contract only accepts messages from other remote BridgeRouter contracts, which are registered by each BridgeRouter
  - therefore, every message received follows the same "rules" that the local BridgeRouter expects
  - for example, any tokens sent in a message are ensured to be valid, because the remote BridgeRouter sending the message should locally enforce that a user has custody before sending the message to the remote chain
- the messages from remote BridgeRouter contracts must be sent via Optics, dispatched by a local Replica contract, which are registered with the UsingOptics contract
  - thus, the BridgeRouter depends on the UsingOptics contract for a valid registry of local Replicas
- if another chain has sent a token that's "native" to this chain, we send that token from the Router contract's escrow to the recipient on this chain
- if we're receiving a token that's not "native" to this chain,
  - we check whether a representation token contract has already been deployed by the Router contract on this chain; if not, we deploy that representation token contract and add its address to the token registry
  - we mint representation tokens on this chain and send them to the recipient

### Dispatching Messages

- **TODO**: describe rules — person must approve token to Router on local chain (if it's a native token) proving they have ownership over that token and can send to the native chain
- sending tokens
  - the user uses ERC-20 `approve` to grant allowance for the tokens being sent to the local BridgeRouter contract
  - the user calls send on the local BridgeRouter to transfer the tokens to a remote
- if the token being sent is "native" to the BridgeRouter's chain, the BridgeRouter contract holds the token in escrow
- if the token being sent is not "native" to the chain, then the local token is a representation token contract deployed by the BridgeRouter in the first place; the BridgeRouter contract burns the tokens before sending them to another chain

### Message Format

- **TODO**: specify how messages are encoded for this application

## Architecture

**BridgeRouter ([code](https://github.com/celo-org/optics-monorepo/blob/main/solidity/optics-xapps/contracts/bridge/BridgeRouter.sol))**

- Receives incoming messages from local `Replica` contracts sending tokens from another chain
- Dispatches outgoing messages to local `Home` contract in order to send tokens to other chains
- Manages a registry of representation ERC-20 token contracts that it deploys on its local chain
- Maintains a registry of remote `BridgeRouter` contracts to
  - authenticate that incoming messages come from a remote `BridgeRouter` contract
  - properly address outgoing messages to remote `BridgeRouter` contracts

**TokenRegistry ([code](https://github.com/celo-org/optics-monorepo/blob/main/solidity/optics-xapps/contracts/bridge/TokenRegistry.sol))**

- Responsible for deploying and keeping track of representation ERC-20 token contracts on this chain
- When a new token is transferred, deploys a new representation token contract on this chain, and stores a two-way mapping between the information of the original token contract & the address of the representation on this chain
- Inherited by the `BridgeRouter`, who uses this to make sure a representation of the token exists on this chain before minting/burning

**BridgeMessage library ([code](https://github.com/celo-org/optics-monorepo/blob/main/solidity/optics-xapps/contracts/bridge/BridgeMessage.sol))**

- Library for handling all the nitty gritty of encoding / decoding messages in a standardized way so they can be sent via Optics

## Message Flow

The logical steps and flow of information involved in sending tokens from one chain to another.

- **Chain A**
  - User wants to send their tokens to Chain B
    - If it's a native token, the user must first `approve` tokens to the local `BridgeRouter-A`
  - User calls `send` on the local `BridgeRouter-A`
    - If it's a native token, tokens are pulled from the User's wallet to `BridgeRouter-A` and held in escrow
    - If it's a non-native token, tokens are burned from User's wallet by `BridgeRouter-A`
      - *Note:* `BridgeRouter-A` can burn non-native tokens because the representative contract for the token on its non-native chain was originally deployed by `BridgeRouter-A` when it received a message sending the token from another chain. The router has administrative rights on representations
  - `BridgeRouter-A` constructs a message to `BridgeRouter-B`
    - `BridgeRouter-A` keeps a mapping of `BridgeRouter` contracts on other chains so it knows where to send the message on Chain B
  - `BridgeRouter-A` calls `enqueue` on `Home-A` contract to send the message to Chain B
- **Off-Chain**
  - Standard Optics behavior. Updater → Relayer → Processor
  - Relayers see message on `Home-A`
  - Relayers pass message to `Replica-A` on Chain B
- **Chain B**
  - After waiting for the acceptance timeout, `Replica-A` processes the message and dispatches it to `BridgeRouter-B`
  - `BridgeRouter-B` keeps a mapping `Replica` contracts that it trusts on the local chain. It uses this to authenticate that the incoming message came from chain A
  - `BridgeRouter-B` keeps a mapping of `BridgeRouter` contracts on other chains, so it can authenticate that this message came from `BridgeRouter-A`
  - `BridgeRouter-B` looks for the corresponding ERC-20 token contract in its registry, and deploys a new representative one if it doesn't already exist
  - `BridgeRouter-B` sends the token to the recipient
    - If it's a native token, `BridgeRouter-B` sends the tokens from the pool it's holding in escrow
    - If it's a non-native token, `BridgeRouter-B` mints the token to the recipient (
      - *Note:* `BridgeRouter-B` can mint non-native tokens because the representative contract for the token on its non-native chain is deployed by `BridgeRouter-B` when it received a message sending the token from another chain. The router has administrative rights on representations.


## Tracing a Message

Optics is currently still under active development. Because Optics batches messages and sends only tree roots, there is no way to track individual messages on-chain once a message is passed to the Home contract. A agent-querying tool could be built to query off-chain agents for individual transactions, but such a tool does not currently exist.

What this means for the token bridge is that there is going to be a state of unknown during the time of send and receipt. You can think of this as snail mail without any tracking but with delivery confirmation. The only things that can be confirmed on-chain are:

  1) A transaction was sent on chain A to the BridgeRouter contract
  2) The recipient addressed received a token mint on chain B


### Pseudo-tracking

1. Start by locating the `bridgeRouter` contract you are looking for, addresses in the config dir:

  * [Dev Contracts](https://github.com/celo-org/optics-monorepo/tree/main/rust/config/development)
  * [Staging Contracts](https://github.com/celo-org/optics-monorepo/tree/main/rust/config/staging)
  * [Prod Contracts](https://github.com/celo-org/optics-monorepo/tree/main/rust/config/mainnet)

2. Verify that a transaction was sent to the BridgeRouter contract on the Home chain
   * _Wait time_: dependent on block confirmation times for each chain

3. Verify a transaction was sent on the Home contract
   * _Wait time_: dependent on block confirmation for each chain, but should be shortly after transaction is sent to BridgeRouter contract
   * There is not a way to query for a particular transactions at this time. Cross-check timestamps with BridgeRouter transaction.

4. After acceptance period, verify a transaction was sent on the destination Replica
   * _Wait time_: acceptance period. Currently ~3 hours
   * Cross-check timestamps

5. Verify a transaction was sent on the destination BridgeRouter
   * _Wait time_: acceptance period + block confirmation time 

6. Verify that the recipient address received a token mint
   1. _Wait time_: block confirmation time for chain A + acceptance period + block confirmation time for chain B

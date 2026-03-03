# Developing Cross-Chain Applications

## Summary

Optics sends messages from one chain to another in the form of raw bytes. A cross-chain application that wishes to *use* Optics will need to define the rules for sending and receiving messages for its use case.

Each cross-chain application must implement its own messaging protocol. By convention, we call the contracts that implement this protocol the application's **Router contracts.** These Router contracts must:

- **maintain a permissioned set** of the contract(s) on remote chains from which it will accept messages via Optics — this could be a single owner of the application on one chain; it could be a registry of other applications implementing the same rules on various chains
- **encode messages in a standardized format**, so they can be decoded by the Router contract on the destination chain
- **handle messages** from remote Router contracts
- **dispatch messages** to remote Router contracts

By implementing these pieces of functionality within a Router contract and deploying it across multiple chains, we create a working cross-chain application using a common language and set of rules. Applications of this kind may use Optics as the cross-chain courier for sending and receiving messages to each other.

## Example Code

This repository has several examples one can use to build understanding around Cross-Chain Applications.

### xApp Template

[This is a template](https://github.com/celo-org/optics-monorepo/tree/main/solidity/optics-xapps/contracts/xapp-template) provided by the Optics team that shows the high-level components of an xApp, ready for one to fill in their own application logic and utilize an Optics channel for cross-chain communication.

To implement a xApp, define the actions you would like to execute across chains.
For each type of action,

- in the [xApp Router](https://github.com/celo-org/optics-monorepo/blob/main/solidity/optics-xapps/contracts/xapp-template/RouterTemplate.sol)
  - implement a function like doTypeA to initiate the action from one domain to another (add your own parameters and logic)
  - implement a corresponding _handle function to receive, parse, and execute this type of message on the remote domain
  - add logic to the handle function to route incoming messages to the appropriate _handle function
- in the [Message library](https://github.com/celo-org/optics-monorepo/blob/main/solidity/optics-xapps/contracts/xapp-template/MessageTemplate.sol),
  - implement functions to *format* the message to send to the other chain (encodes all necessary information for the action)
  - implement functions to *parse* the message once it is received on the other chain (decode all necessary information for the action)

### Ping Pong xApp

**Important!** The Ping Pong xApp is for reference only. Please do not deploy!

[The PingPong xApp](https://github.com/celo-org/optics-monorepo/tree/main/solidity/optics-xapps/contracts/ping-pong) is capable of initiating PingPong "matches" between two chains. A match consists of "volleys" sent back-and-forth between the two chains via Optics.

The first volley in a match is always a Ping volley.

- When a Router receives a Ping volley, it returns a Pong.
- When a Router receives a Pong volley, it returns a Ping.

The Routers keep track of the number of volleys in a given match, and emit events for each Sent and Received volley so that spectators can watch.

### Token Bridge xApp

See the full-length [Token Bridge Documentation](#TODO) for in-depth details on Token Bridge operation and construction.

[Link to Contracts](https://github.com/celo-org/optics-monorepo/tree/main/solidity/optics-xapps/contracts/bridge)

### Cross-Chain Governance xApp

See the full-length [Optics Governance Documentation](#TODO) for in-depth details on Governance xApp operation and construction.

[Link to Contracts](https://github.com/celo-org/optics-monorepo/tree/main/solidity/optics-core/contracts/governance)

## Useful Links

- [xApp Developers Workshop @ EthCC 2021 by Anna Carroll](https://www.youtube.com/watch?v=E_zhTRsxWtw)

## Glossary of Terms

- **Local vs Remote**: in the context of discussing a particular contract, it is deployed on a particular chain. Contracts and assets on that chain are "local." Contracts and assets on another chain are "remote"
  - e.g. Uniswap is deployed on Ethereum. Ethereum is the local chain. Celo is a remote chain
  - e.g. there is a token deployed on Celo. There is a local `Home` contract (on Celo), and a local `Replica` contract (on Celo) receiving messages from Ethereum. There is a remote `Home` (on Ethereum) sending messages. There is a remote `Replica` (on Ethereum) receiving messages from Celo. There is a remote `Router` (on Ethereum) communicating with the local `Router` on Celo.
- **"Locally originating" vs "Remotely Originating"**: in the context of a token or asset in a specific contract, these terms denote whether the original canonical contract is deployed on the local chain, or on a remote chain
  - e.g. cUSD originates on Celo. in the context of the Celo blockchain, cUSD is "of local origin" or "locally originating"; in the context of the Ethereum blockchain, cUSD is "of remote origin"
  - e.g. Ether and WETH originate on Ethereum. When used in a Celo contract, they are "remotely originating" or "of remote origin"
  - e.g. a `Router` receives a Transfer message for a remotely-originating asset. It finds the local contract that represents that asset. When it receives a message for a locally originating asset, it knows that it can find the original asset contract locally
- **Router Contract**: a contract that implements a cross-chain application by specifying the:
  - **message format** - the bytes-encoded format of messages for the application
  - **registry of remote Router contracts** that implement the same application on remote chains
  - **rules & behavior for handling messages** sent via Optics by a registered Router contract on a remote chain
  - **rules & behavior for dispatching messages** via Optics to a registered Router contract on a remote chain
- **Message**: bytes transferred via Optics that encode some application-specific instructions via a standardized set of rules
- **Instructions**: set of application-specific actions (e.g. "send 5 token X to 0x123...456 on chain Z" in the case of a Token Bridge); calls to functions on the Router contract
- **Handling Messages from Optics Channels**:
  - receive bytes-encoded message from Optics (sent from a remote chain)
  - enact or dispatch the instructions on the local chain
  - local handler decodes the message into application-specific instructions
- **Dispatching Message to Optics Channels**:
  - receive instructions on the local chain (via local users and contracts calling functions on the contract)
  - encode the instructions into bytes using standardized message format
  - dispatch the bytes-encoded message to Optics (to be sent to a remote chain)

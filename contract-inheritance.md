# Contract Inheritance

## Core Contracts

- Home (initializes Common)
  - MerkleTreeManager
  - Common (initializes QueueManager)
    - QueueManager
- Replica (initializes Common)
  -Common (initializes QueueManager)
    -QueueManager
- UpdaterManager
- XAppConnectionManager
- MerkleTreeManager

### Upgrade

- UpgradeBeacon
- UpgradeBeaconController
- UpgradeBeaconProxy

### Governance

- GovernanceRouter

## xApps

### Token Bridge

- BridgeRouter (initializes TokenRegistry and Router)
  - TokenRegistry
  - Router (initializes XAppConnectionClient)
    - XAppConnectionClient
- BridgeToken
  - ERC20
- ETHHelper

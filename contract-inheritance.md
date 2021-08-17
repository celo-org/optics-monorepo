# Contract Inheritance

## Core Contracts

- Home (initializes Common, OwnableUpgradeable)
  - MerkleTreeManager
  - Common (initializes QueueManager)
    - QueueManager
  - OwnableUpgradeable
- Replica (initializes Common)
  -Common (initializes QueueManager)
  -QueueManager
- UpdaterManager
  - Ownable
  - IUpdaterManager
- XAppConnectionManager
  - Ownable
- MerkleTreeManager

### Upgrade

- UpgradeBeacon
- UpgradeBeaconController
  - Ownable
- UpgradeBeaconProxy

### Governance

- GovernanceRouter
  - Initializable
  - IMessageRecipient

## xApps

### Token Bridge

- BridgeRouter (initializes TokenRegistry and XAppConnectionClient)
  - TokenRegistry
    - Initializable
  - Router (no initializer)
    - XAppConnectionClient (initializes OwnableUpgradeable)
      - OwnableUpgradeable
- BridgeToken (initializes OwnableUpgradeable)
  - ERC20
  - OwnableUpgradeable
  - IBridgeToken
- ETHHelper

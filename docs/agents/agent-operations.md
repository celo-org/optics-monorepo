# Agent Operations

## Deployment Environments

There will exist several logical deployments of Optics to enable us to test new code/logic before releasing it to Mainnet. Each environment encompasses the various Home/Replica contracts deployed to many blockchains, as well as the agent deployments and their associated account secrets.

The environments have various purposes and can be described as follows:

### Development

Purpose: Allows us to test changes to contracts and agents. *Bugs should be found here.*

- Deployed against testnets
- Agent Accounts: HexKeys stored in a secret manager for ease of rotation/access
- Agent Infrastructure: Optics core team will operate agent infrastructure for this.
- Node Infrastructure: Forno/Infura
- Agent Deployments: Automatic, continuous deployment
- Contract Deployments: Automatic, with human intervention required for updating the **upgradeBeacon**.

### Staging

Purpose: Allows us to test the full-stack integration, specifically surrounding the KMS access control and federated secret management. *Issues with process should be found here.*

- Deployed against testnets, mirrors Mainnet deployment.
- Agent Accounts: KMS-provisioned keys
- Agent Infrastructure: Agent operations will be decentralized
- Node Infrastructure: Node infrastructure will be decentralized
- Agent Deployments: Determined by whoever is running the agents
- Contract Deployments: Automatic, with human intervention required for updating the **upgradeBeacon**.

### Production

Purpose: Where the magic happens, **things should not break here.** 

- Deployed against Mainnets
- Agent Accounts: KMS-provisioned keys
- Agent Infrastructure: Agent operations will be decentralized
- Node Infrastructure: Node infrastructure will be decentralized
- Agent Deployments: Determined by whoever is running the agents
- Contract Deployments: ***Manual*** - Existing tooling can be used, but deploys will be gated and require approval as contract deployments are expensive on Mainnet.

## Key Material

Keys for Staging and Production environments will be stored in AWS KMS, which is a highly flexible solution in terms of granting access. It guarantees nobody will ever have access to the key material itself, while still allowing granular permissions over access to remote signing. 

At the outset, the Optics team will have full control over agent keys, and any contracted party will simply be granted access through existing IAM tooling/roles.

### Provision KMS Keys

There exists a script in this repository (`rust/provision_kms_keys.py`) that facilitates KMS key provisioning for agent roles.

The script will produce a single set of keys per "environment." Where an __environment__ is a logical set of smart contract deployments. By default there are two environments configured, `staging` and `production` where `staging` is testnet deployments of the contracts and `production` corresponds to mainnet deployments.

The current strategy, in order to reduce complexity, is to use the same keys for transaction signing on both Celo and Ethereum networks. Should you desire, the key names to be provisioned can be modified such that the script creates unique keys per-network. Ex:

```python
# Agent Keys
required_keys = [
  "watcher-signer-alfajores",
  "watcher-attestation-alfajores",
  "watcher-signer-kovan",
  "watcher-attestation-kovan",
  "updater-signer-alfajores",
  "updater-attestation-alfajores",
  "updater-signer-kovan",
  "updater-attestation-kovan",
  "processor-signer-alfajores",
  "processor-signer-kovan",
  "relayer-signer-alfajores",
  "relayer-signer-kovan"
]
```

#### Run the Key Provisioning Script

```bash
AWS_ACCESS_KEY_ID=accesskey AWS_SECRET_ACCESS_KEY=secretkey python3 provision_kms_keys.py  
```

If the required keys are not present, the script will generate them. If they keys _are_ present, their information will be fetched and displayed non-destructively. 

Upon successful operation, the script will output a table of the required keys, their ARNs, ETH addresses (for funding the accounts), and their regions. 

#### Provision IAM Policies and Users

This is an opinionated setup that works for most general agent operations use-cases. The same permissions boundaries can be achieved through different means, like using only [Key Policies](https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html)

Background Reading/Documentation:

- [KMS Policy Conditions](https://docs.aws.amazon.com/kms/latest/developerguide/policy-conditions.htm)
- [KMS Policy Examples](https://docs.aws.amazon.com/kms/latest/developerguide/customer-managed-policies.html)
- [CMK Alias Authorization](https://docs.aws.amazon.com/kms/latest/developerguide/alias-authorization.html)

The following sequence describes how to set up IAM policies staging and production deployments.

- Create two users
  - optics-signer-staging
  - optics-signer-production
  - kms-admin
  - Save IAM credential CSV
- Create staging signer policies
  - staging-processor-signer
  - staging-relayer-signer
  - staging-updater-signer
  - staging-watcher-signer
  - With the following policy, modified appropriately:

  ```json
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Sid": "OpticsStagingPolicy",
          "Effect": "Allow",
          "Action": [
            "kms:GetPublicKey",
            "kms:Sign"
          ],
          "Resource": "arn:aws:kms:*:11111111111:key/*",
          "Condition": {
            "ForAnyValue:StringLike": {
              "kms:ResourceAliases": "alias/staging-processor*"
            }
          }
        }
      ]
    }
  ```

  - production-processor-signer
  - production-relayer-signer
  - production-updater-signer
  - production-watcher-signer
  - With the following policy, modified appropriately:

  ```json
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Sid": "OpticsProductionPolicy",
          "Effect": "Allow",
          "Action": [
            "kms:GetPublicKey",
            "kms:Sign"
          ],
          "Resource": "arn:aws:kms:*:11111111111:key/*",
          "Condition": {
            "ForAnyValue:StringLike": {
              "kms:ResourceAliases": "alias/production-processor*"
            }
          }
        }
      ]
    }
    ```

- Create kms-admin policy

  ```json
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Sid": "KMSAdminPolicy",
          "Effect": "Allow",
          "Action": [
            "kms:DescribeCustomKeyStores",
            "kms:ListKeys",
            "kms:DeleteCustomKeyStore",
            "kms:GenerateRandom",
            "kms:UpdateCustomKeyStore",
            "kms:ListAliases",
            "kms:DisconnectCustomKeyStore",
            "kms:CreateKey",
            "kms:ConnectCustomKeyStore",
            "kms:CreateCustomKeyStore"
          ],
          "Resource": "*"
        },
        {
          "Sid": "VisualEditor1",
          "Effect": "Allow",
          "Action": "kms:*",
          "Resource": [
            "arn:aws:kms:*:756467427867:alias/*",
            "arn:aws:kms:*:756467427867:key/*"
          ]
        }
      ]
    }
  ```

  - Create IAM groups
    - staging-signer
    - production-signer
    - kms-admin
  - Add previously created users to the corresponding groups
    - optics-signer-staging -> staging-signer
    - opticics-signer-production -> production-signer
    - kms-admin -> kms-admin

## Funding Addresses

Each agent should be configured with a unique wallet to be used to signing transactions and paying gas. This section describes the process of funding these signer wallets.

Note: It is currently inadvisable to to run multiple Agent setups with the same set of Transaction Signers.

### Steps

1. Generate KMS keys using instructions from the previous section.
2. Enumerate Signer Addresses via the table included as part of the output of `provision_kms_keys.py`, or via whatever method you used to generate keys.
3. Send individual funding transactions to each address
    - Note: 500 ETH should be sufficient for testnet addresses.
4. Edit deployment config to match new signers

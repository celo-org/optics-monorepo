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
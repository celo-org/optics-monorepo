## Prover CLI

This CLI directly accesses a synced or partially-synced processor DB, retrieves
messages and proofs, and dispatches them to the contracts.

### Usage

- `cargo run --bin prove-cli`
  - `--leaf-index` OR `--leaf_hash` - specify the leaf to prove
    - `leaf_index` takes precedence if both are specified
  - `--rpc` specify the RPC endpoint
  - `--key` specify the hex key to use to sign txns
    - in future versions this will be an env var or a node or aws signer
  - `--db` specify the filepath to the DB
  - `--address` specify the Replica address to submit to

### Exampl

Submit a proof of leaf 23 in SOME tree to celo.

- `cargo run --bin prove-cli --leaf-index 23 --rpc "https://forno.celo.org" --key $FUNDED_CELO_PRIVKEY --db ../dbs/whatever --address 0x1234..abcd`

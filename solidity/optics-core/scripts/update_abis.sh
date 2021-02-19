#!/bin/zsh

cat artifacts/contracts/Replica.sol/ProcessingReplica.json| jq .abi > ../../abis/ProcessingReplica.abi.json && \
cat artifacts/contracts/Home.sol/Home.json| jq .abi > ../../abis/Home.abi.json && \

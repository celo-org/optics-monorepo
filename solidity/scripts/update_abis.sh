#!/bin/zsh

cat artifacts/contracts/Replica.sol/ProcessingReplica.json| jq .abi > ./lib/ProcessingReplica.abi.json && \
cat artifacts/contracts/Home.sol/Home.json| jq .abi > ./lib/Home.abi.json && \
cp ./lib/*.json ../rust/optics-base/src/abis/

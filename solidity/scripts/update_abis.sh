#!/bin/zsh
cat artifacts/contracts/Replica.sol/ProcessingReplica.json| jq .abi > ../rust/optics-base/src/abis/ProcessingReplica.abi.json && \
cat artifacts/contracts/Home.sol/Home.json| jq .abi > ../rust/optics-base/src/abis/Home.abi.json

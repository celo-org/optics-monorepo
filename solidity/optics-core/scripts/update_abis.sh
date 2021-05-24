cat artifacts/contracts/Replica.sol/Replica.json| jq .abi > ../../rust/optics-ethereum/abis/Replica.abi.json && \
cat artifacts/contracts/Home.sol/Home.json| jq .abi > ../../rust/optics-ethereum/abis/Home.abi.json && \
cat artifacts/contracts/XAppConnectionManager.sol/XAppConnectionManager.json | jq .abi > ../../rust/optics-ethereum/abis/XAppConnectionManager.abi.json
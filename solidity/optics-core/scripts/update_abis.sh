cat artifacts/contracts/Replica.sol/Replica.json| jq .abi > ../../abis/Replica.abi.json && \
cat artifacts/contracts/Home.sol/Home.json| jq .abi > ../../abis/Home.abi.json && \
cat artifacts/contracts/XAppConnectionManager.sol/XAppConnectionManager.json | jq .abi > ../../abis/XAppConnectionManager.abi.json

cat artifacts/contracts/Replica.sol/Replica.json| jq .abi > ../../rust/abis/Replica.abi.json && \
cat artifacts/contracts/Home.sol/Home.json| jq .abi > ../../rust/abis/Home.abi.json && \
cat artifacts/contracts/XAppConnectionManager.sol/XAppConnectionManager.json | jq .abi > ../../rust/abis/XAppConnectionManager.abi.json
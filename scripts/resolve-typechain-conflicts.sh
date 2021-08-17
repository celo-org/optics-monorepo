# Script for resolving typechain conflicts
# Run from root (./scripts/resolve-typechain-conflicts.sh)
cd ./solidity/optics-core
npm run compile
cd ../optics-xapps
npm run compile
cd ../..
git add typescript/typechain

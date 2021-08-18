# script for running solidity tests locally
# Run from root (./scripts/test-solidity.sh)

set -e

# compile contracts
cd ./solidity/optics-core
npm run compile
cd ../optics-xapps
npm run compile
# run tests
cd ../../typescript/optics-tests
npm i
npm run testNoCompile
cd ../..
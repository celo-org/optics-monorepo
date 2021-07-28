git rm -rf typescript/typechain/optics-xapps
git rm -rf typescript/typechain/optics-core
cd solidity/optics-core
npm run compile
cd ../optics-xapps
npm run compile
cd ../..
git add typescript/typechain

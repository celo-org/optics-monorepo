rm -rf typescript/src/typechain
cd solidity/optics-core 
hardhat compile
cd ../optics-xapps
hardhat compile
cd ../..
git add typescript/src/typechain
git rebase --continue
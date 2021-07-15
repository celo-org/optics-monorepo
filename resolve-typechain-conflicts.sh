git rm -rf typescript/typechain
cd solidity/optics-core 
hardhat compile
cd ../optics-xapps
hardhat compile
cd ../..
git add typescript/typechain

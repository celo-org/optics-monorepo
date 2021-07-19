# Conditionally generate typechain
if ! git diff-index --quiet HEAD -- ./solidity/optics-core; then
    echo "+generating core typechain"
    cd ./solidity/optics-core
    npx hardhat typechain
    cd ../..
else
    echo "+Skipping core typechain generation"
fi

# Conditionally generate typechain
if ! git diff-index --quiet HEAD -- ./solidity/optics-xapps; then
    echo "+generating xapps typechain"
    cd ./solidity/optics-xapps
    npx hardhat typechain
    cd ../..
else
    echo "+Skipping xapps typechain generation"
fi

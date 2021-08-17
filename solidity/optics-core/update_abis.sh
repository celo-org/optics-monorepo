#!/bin/sh 

copy() {
    jq .abi < artifacts/contracts/"$1".sol/$.json > ../rust/chains/optics-ethereum/abis/"$1".abi.json
}

copy Replica && copy Home && copy XAppConnectionManager
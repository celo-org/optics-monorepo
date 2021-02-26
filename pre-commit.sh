#!/bin/sh

abort()
{
    echo >&2 '
***************
*** ABORTED ***
***************
'
    echo "An error occurred. Please review your code and try again" >&2
    exit 1
}

trap 'abort' 0

set -e
cd solidity/optics-core/
npm test
npm run lint
cd ../optics-bridge/
npm test
npm run lint

cd ../../rust/
echo '+cargo test'
cargo test
echo '+cargo clippy -- -D warnings'
cargo clippy -- -D warnings
echo '+cargo fmt -- --check'
cargo fmt -- --check
cd ..

trap : 0

trap : 0

echo >&2 '
************
*** DONE *** 
************
'

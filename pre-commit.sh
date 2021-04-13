#!/bin/sh

# Stash uncommitted changes
STASH_NAME="pre-commit-$(date +%s)"
git stash save -q --keep-index $STASH_NAME

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
git update-index -q --refresh

if ! git diff-index --quiet HEAD -- ./solidity/optics-core; then
    cd solidity/optics-core
    npm test
    npm run lint
    cd ../..
fi

if ! git diff-index --quiet HEAD -- ./solidity/optics-bridge; then
    cd solidity/optics-bridge
    npm test
    npm run lint
    cd ../..
fi

if ! git diff-index --quiet HEAD -- ./rust ./abis; then
    cd ./rust
    echo '+cargo test'
    cargo test
    echo '+cargo clippy -- -D warnings'
    cargo clippy -- -D warnings
    echo '+cargo fmt -- --check'
    cargo fmt -- --check
    cd ..
fi

trap : 0

trap : 0

echo >&2 '
************
*** DONE *** 
************
'

git stash apply stash^{/$STASH_NAME}

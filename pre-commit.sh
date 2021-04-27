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

VECTORS_MODIFIED=false

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

if ! git diff-index --quiet HEAD -- ./rust/optics-core/src/lib.rs; then
    cd ./rust/optics-core
    echo '+cargo run --bin lib_test_output --features output'
    cargo run --bin lib_test_output --features output
    cd ../..
    VECTORS_MODIFIED=true
fi

if ! git diff-index --quiet HEAD -- ./rust/optics-core/src/utils.rs; then
    cd ./rust/optics-core
    echo '+cargo run --bin utils_test_output --features output'
    cargo run --bin utils_test_output --features output
    cd ../..
    VECTORS_MODIFIED=true
fi

if ! git diff-index --quiet HEAD -- ./solidity/optics-core || [ "$VECTORS_MODIFIED" = true ]; then
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

trap : 0

trap : 0

trap : 0

trap : 0

# Only add updated vectors if checks passed
if [ "$VECTORS_MODIFIED" = true ]; then
    echo '+git add ./vectors/*'
    git add ./vectors/*
fi

echo >&2 '
************
*** DONE *** 
************
'

git stash apply stash^{/$STASH_NAME}

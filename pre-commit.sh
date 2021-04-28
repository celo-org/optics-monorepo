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

# Conditionally compile and update optics-core abis
if ! git diff-index --quiet HEAD -- ./solidity/optics-core; then
    cd ./solidity/optics-core
    npm run compile
    cd ../..
fi

# Conditionally compile and update optics-bridge abis
if ! git diff-index --quiet HEAD -- ./solidity/optics-bridge; then
    cd ./solidity/optics-bridge
    npm run compile
    cd ../..
fi

# Run rust tests, clippy, and formatting
if ! git diff-index --quiet HEAD -- ./rust ./abis; then
    cd rust
    echo '+cargo test'
    cargo test
    echo '+cargo clippy -- -D warnings'
    cargo clippy -- -D warnings
    echo '+cargo fmt -- --check'
    cargo fmt -- --check
    cd ..
fi

VECTORS_MODIFIED=false

# Conditionally run Rust bins to output into vector JSON files
if ! git diff-index --quiet HEAD -- ./rust/optics-core/src/lib.rs; then
    cd ./rust/optics-core
    echo '+cargo run --bin lib_test_output --features output'
    cargo run --bin lib_test_output --features output
    cd ../..
    VECTORS_MODIFIED=true
fi

# Conditionally run Rust bins to output into vector JSON files
if ! git diff-index --quiet HEAD -- ./rust/optics-core/src/utils.rs; then
    cd ./rust/optics-core
    echo '+cargo run --bin utils_test_output --features output'
    cargo run --bin utils_test_output --features output
    cd ../..
    VECTORS_MODIFIED=true
fi

# Run solidity/optics-core tests and lint
if ! git diff-index --quiet HEAD -- ./solidity/optics-core || [ "$VECTORS_MODIFIED" = true ]; then
    cd ./solidity/optics-core
    npm test
    npm run lint
    cd ../..
fi

# Run solidity/optics-bridge tests and lint
if ! git diff-index --quiet HEAD -- ./solidity/optics-bridge; then
    cd ./solidity/optics-bridge
    npm test
    npm run lint
    cd ../..
fi

trap : 0

trap : 0

trap : 0

trap : 0

# If checks passed, format and git add JSON files
if [ "$VECTORS_MODIFIED" = true ]; then
    for file in vectors/*.json; do
        temp=$(mktemp)
        jq . "$file" > "$temp"
        mv -f "$temp" "$file"
    done

    echo '+git add ./vectors/*'
    git add ./vectors/*
fi

echo >&2 '
************
*** DONE *** 
************
'

git stash apply stash^{/$STASH_NAME}

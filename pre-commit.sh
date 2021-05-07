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
    git stash apply stash^{/$STASH_NAME} -q
    exit 1
}

trap 'abort' 0

set -e
git update-index -q --refresh

# Conditionally compile and update optics-core abis
if ! git diff-index --quiet HEAD -- ./solidity/optics-core; then
    echo "+Updating core ABIs"
    cd ./solidity/optics-core
    npm run compile
    cd ../..
else
    echo "+Skipping core ABI updates"
fi

# Conditionally compile and update optics-xapps abis
    echo "+Updating xapps ABIs"
if ! git diff-index --quiet HEAD -- ./solidity/optics-xapps; then
    cd ./solidity/optics-xapps
    npm run compile
    cd ../..
else
    echo "+Skipping xapps ABI updates"
fi

# Conditionally run Rust bins to output into vector JSON files
if ! git diff-index --quiet HEAD -- ./rust/optics-core/src/lib.rs; then
    echo "+Running lib vector generation"
    cd ./rust/optics-core
    echo '+cargo run --bin lib_test_output --features output'
    cargo run --bin lib_test_output --features output
    cd ../..
else
    echo "+Skipping lib vector generation"
fi

# Conditionally run Rust bins to output into vector JSON files
if ! git diff-index --quiet HEAD -- ./rust/optics-core/src/utils.rs; then
    echo "+Running utils vector generation"
    cd ./rust/optics-core
    echo '+cargo run --bin utils_test_output --features output'
    cargo run --bin utils_test_output --features output
    cd ../..
else
    echo "+Skipping utils vector generation"
fi

# Run rust tests, clippy, and formatting
if ! git diff-index --quiet HEAD -- ./rust ./abis; then
    echo "+Running rust tests"
    cd ./rust
    echo '+cargo fmt -- --check'
    cargo fmt -- --check
    echo '+cargo clippy -- -D warnings'
    cargo clippy -- -D warnings
    echo '+cargo test -- -q'
    cargo test -- -q
    cd ..
else
    echo "+Skipping rust tests"
fi

# Run solidity/optics-core tests and lint
if ! git diff-index --quiet HEAD -- ./solidity/optics-core ./vectors; then
    echo "+Running optics core tests"
    cd ./solidity/optics-core
    npm run lint
    npm test
    cd ../..
else
    echo "+Skipping optics core tests"
fi

<<<<<<< HEAD
# Run solidity/optics-bridge tests and lint
if ! git diff-index --quiet HEAD -- ./solidity/optics-bridge; then
    echo "+Running optics bridge tests"
    cd ./solidity/optics-bridge
=======
# Run solidity/optics-xapps tests and lint
if ! git diff-index --quiet HEAD -- ./solidity/optics-xapps; then
    cd ./solidity/optics-xapps
    npm test
>>>>>>> d84ef94 (Refactor/rename optics-bridge directory to optics-xapps/token-bridge)
    npm run lint
    npm test
    cd ../..
else
    echo "+Skipping optics bridge tests"
fi

# Git add abis if updated
if ! git diff-index --quiet HEAD -- ./abis; then
    echo '+git add ./abis/*'
    git add ./abis/*
else
    echo "+Skipping git add ABIs"
fi

# Format and git add JSON files if updated
if ! git diff-index --quiet HEAD -- ./vectors; then
    for file in vectors/*.json; do
        temp=$(mktemp)
        jq . "$file" > "$temp"
        mv -f "$temp" "$file"
    done

    echo '+git add ./vectors/*'
    git add ./vectors/*
else
    echo "+Skipping git add vectors"
fi

trap : 0

echo >&2 '
************
*** DONE ***
************
'

git stash apply stash^{/$STASH_NAME} -q

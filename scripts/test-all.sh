#!/bin/sh
# Script for testing entire optics monorepo unconditionally
# Run from root (./scripts/test-all.sh)

# update ABIs
cd ./solidity

echo "+Lint and compile core"
cd ./optics-core
npm run lint
npm run compile

echo "+Lint and compile xApps"
cd ../optics-xapps
npm run lint
npm run compile
cd ..

# run Rust bins to output into vector JSON files
cd ../rust/optics-core

echo "+Running lib vector generation"
echo '+cargo run --bin lib_test_output --features output'
cargo run --bin lib_test_output --features output

echo "+Running utils vector generation"
echo '+cargo run --bin utils_test_output --features output'
cargo run --bin utils_test_output --features output
cd ..

# Run rust tests, clippy, and formatting
echo "+Running rust tests"
echo '+cargo fmt -- --check'
cargo fmt -- --check
echo '+cargo clippy -- -D warnings'
cargo clippy -- -D warnings
echo '+cargo test -- -q'
cargo test -- -q
cd ..

# Run solidity tests
echo "+Running solidity tests"
cd ./typescript/optics-tests
npm run testNoCompile

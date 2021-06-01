#!/bin/sh

# update ABIs
cd ./solidity

echo "+Updating core ABIs"
cd ./optics-core
npm run compile

echo "+Updating xapps ABIs"
cd ../optics-xapps
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
cd ./solidity

# Run solidity/optics-core tests and lint
echo "+Running optics core tests"
cd ./optics-core
npm run lint
npm test

# Run solidity/optics-xapps tests and lint
echo "+Running optics-xapps tests"
cd ../optics-xapps
npm run lint
npm test

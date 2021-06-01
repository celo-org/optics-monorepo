#!/bin/sh

echo "+Updating core ABIs"
cd ./solidity/optics-core
npm run compile
cd ../..

echo "+Updating xapps ABIs"
cd ./solidity/optics-xapps
npm run compile
# add files in case linter modified them
git add .
cd ../..

# Conditionally run Rust bins to output into vector JSON files
echo "+Running lib vector generation"
cd ./rust/optics-core
echo '+cargo run --bin lib_test_output --features output'
cargo run --bin lib_test_output --features output
cd ../..

# Conditionally run Rust bins to output into vector JSON files
echo "+Running utils vector generation"
cd ./rust/optics-core
echo '+cargo run --bin utils_test_output --features output'
cargo run --bin utils_test_output --features output
cd ../..

# Run rust tests, clippy, and formatting
echo "+Running rust tests"
cd ./rust
echo '+cargo fmt -- --check'
cargo fmt -- --check
echo '+cargo clippy -- -D warnings'
cargo clippy -- -D warnings
echo '+cargo test -- -q'
cargo test -- -q
cd ..

# Run solidity/optics-core tests and lint
echo "+Running optics core tests"
cd ./solidity/optics-core
npm run lint
npm test
cd ../..

# Run solidity/optics-xapps tests and lint
echo "+Running optics-xapps tests"
cd ./solidity/optics-xapps
npm run lint
npm test

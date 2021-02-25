set -e
cd solidity/optics-core/
npm test && npm run prettier && npm run lint
cd ../optics-bridge/
npm test && npm run prettier && npm run lint

cd ../../rust/
echo '+cargo test'
cargo test
echo '+cargo clippy -- -D warnings'
cargo clippy -- -D warnings
echo '+cargo fmt -- --check'
cargo fmt -- --check
cd ..

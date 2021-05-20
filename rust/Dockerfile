# syntax=docker/dockerfile:experimental

FROM rust:1.52 as builder
WORKDIR /usr/src

# 1a: Prepare for static linking
RUN apt-get update && \
    apt-get dist-upgrade -y && \
    apt-get install -y musl-tools clang-6.0 && \
    rustup target add x86_64-unknown-linux-musl

# Add workspace to workdir 
COPY abis ./abis
COPY optics-core ./optics-core
COPY optics-ethereum ./optics-ethereum
COPY optics-base ./optics-base 
COPY optics-test ./optics-test
COPY processor ./processor
COPY relayer ./relayer
COPY watcher ./watcher
COPY updater ./updater
COPY kathy ./kathy
COPY Cargo.toml .
COPY Cargo.lock .

# Build binaries
RUN --mount=id=cargo,type=cache,target=/usr/src/target \
  --mount=id=cargo-home-registry,type=cache,target=/usr/local/cargo/registry \
  --mount=id=cargo-home-git,type=cache,target=/usr/local/cargo/git \
    cargo build --release

# Copy artifacts out of volume
WORKDIR /release 
RUN --mount=id=cargo,type=cache,target=/usr/src/target  cp /usr/src/target/release/updater .
RUN --mount=id=cargo,type=cache,target=/usr/src/target  cp /usr/src/target/release/relayer .
RUN --mount=id=cargo,type=cache,target=/usr/src/target  cp /usr/src/target/release/watcher .
RUN --mount=id=cargo,type=cache,target=/usr/src/target  cp /usr/src/target/release/processor .
RUN --mount=id=cargo,type=cache,target=/usr/src/target  cp /usr/src/target/release/kathy .

# 2: Copy the binaries to release image
FROM ubuntu:20.04
RUN apt-get update && \
    apt-get install -y libssl-dev 
COPY --from=builder /release/updater .
COPY --from=builder /release/relayer .
COPY --from=builder /release/watcher .
COPY --from=builder /release/processor .
COPY --from=builder /release/kathy .
USER 1000
CMD ["./watcher"]
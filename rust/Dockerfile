# syntax=docker/dockerfile:experimental

FROM rust:1.56 as builder
WORKDIR /usr/src

# 1a: Prepare for static linking
RUN apt-get update && \
    apt-get dist-upgrade -y && \
    apt-get install -y musl-tools clang && \
    rustup target add x86_64-unknown-linux-musl

# Add workspace to workdir 
COPY agents ./agents
COPY chains ./chains
COPY tools ./tools
COPY optics-base ./optics-base 
COPY optics-core ./optics-core
COPY optics-test ./optics-test

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
# Commented out pending https://github.com/celo-org/optics-monorepo/issues/782
# RUN --mount=id=cargo,type=cache,target=/usr/src/target  cp /usr/src/target/release/watcher .
RUN --mount=id=cargo,type=cache,target=/usr/src/target  cp /usr/src/target/release/processor .
RUN --mount=id=cargo,type=cache,target=/usr/src/target  cp /usr/src/target/release/kathy .
RUN --mount=id=cargo,type=cache,target=/usr/src/target  cp /usr/src/target/release/kms-cli .
RUN --mount=id=cargo,type=cache,target=/usr/src/target  cp /usr/src/target/release/optics-cli .

# 2: Copy the binaries to release image
FROM ubuntu:20.04
RUN apt-get update && \
    apt-get install -y libssl-dev \
    ca-certificates

WORKDIR /app
COPY --from=builder /release/updater .
COPY --from=builder /release/relayer .
# COPY --from=builder /release/watcher .
COPY --from=builder /release/processor .
COPY --from=builder /release/kathy .
COPY --from=builder /release/kms-cli .
COPY --from=builder /release/optics-cli .
COPY config ./config
RUN chmod 777 /app
RUN mkdir /usr/share/optics/ && chmod 1000 /usr/share/optics
USER 1000
CMD ["./watcher"]
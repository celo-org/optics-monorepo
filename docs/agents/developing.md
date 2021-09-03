# Developing the Agents

## Configuration 

Agents read settings from the config files and/or env.

Config files are loaded from `rust/config/default` unless specified otherwise. Currently deployment config directories are labeled by the timestamp at which they were deployed

Configuration key/value pairs are loaded in the following order, with later sources taking precedence:

1. The config file specified by the `RUN_ENV` and `BASE_CONFIG` env vars. `$RUN_ENV/$BASE_CONFIG`
2. The config file specified by the `RUN_ENV` env var and the agent's name. `$RUN_ENV/{agent}-partial.json`.
  E.g. `$RUN_ENV/updater-partial.json`
3. Configuration env vars with the prefix `OPT_BASE` intended to be shared by multiple agents in the same environment
  E.g. `export OPT_BASE_REPLICAS_KOVAN_DOMAIN=3000`
4. Configuration env vars with the prefix `OPT_{agent name}` intended to be used by a specific agent.
  E.g. `export OPT_KATHY_CHAT_TYPE="static message"`

## Building an Agent for Development

For contributing to the Rust codebase, it is advantageous and preferable to build agents using your host dev environment. As mentioned in the previous section, configuration precedence is your friend here. You can specify the base config json to use, and then override variables via the environment.

Below is a sample `tmp.env` file with appropriate variables to run an agent instance against the development environment. 

Note: You will need to fetch dev keys (or generate your own via a contract deployment) for this to work properly. 

`tmp.env`:
```
RUN_ENV=1625169020727
OPT_BASE_TRACING_LEVEL=info

OPT_UPDATER_UPDATER_KEY=<HexKey>

OPT_UPDATER_DB=updaterdb
OPT_RELAYER_DB=relayerdb
OPT_KATHY_DB=kathydb

OPT_KATHY_SIGNERS_ALFAJORES_KEY=<HexKey>
OPT_UPDATER_SIGNERS_ALFAJORES_KEY=<HexKey>
OPT_RELAYER_SIGNERS_ALFAJORES_KEY=<HexKey>
OPT_PROCESSOR_SIGNERS_ALFAJORES_KEY=<HexKey>

OPT_KATHY_SIGNERS_KOVAN_KEY=<HexKey>
OPT_UPDATER_SIGNERS_KOVAN_KEY=<HexKey>
OPT_RELAYER_SIGNERS_KOVAN_KEY=<HexKey>
OPT_PROCESSOR_SIGNERS_KOVAN_KEY=<HexKey>
```

Lets walk through the variables here: 

`RUN_ENV` - Specifies the config folder to load configuration from, defaults to `default`. 
`OPT_BASE_TRACING_LEVEL` - Specifies the log level the agents should boot up with. 
`OPT_UPDATER_UPDATER_KEY` - The Updater attestation key.
`OPT_<ROLE>_DB` - The <ROLE>-specific path to save the agent database, setting individual locations here allows one to run multiple instances of an agent at once without them stepping on one-another. 
`OPT_<ROLE>_SIGNERS_<NETWORK>_KEY` - The <ROLE>-specific transaction key to use when signing transactions on <NETWORK>.

For a full list of potentially useful common environment variables, check out the Agent Helm Chart's [ConfigMap](https://github.com/celo-org/optics-monorepo/blob/main/rust/helm/optics-agent/templates/configmap.yaml#L8-L34)

Agents also have role-specific environment variables in their StatefulSet definitions: 
- [Updater](https://github.com/celo-org/optics-monorepo/blob/main/rust/helm/optics-agent/templates/updater-statefulset.yaml#L54-L89)
- [Relayer](https://github.com/celo-org/optics-monorepo/blob/main/rust/helm/optics-agent/templates/relayer-statefulset.yaml#L54-L74)
- [Processor](https://github.com/celo-org/optics-monorepo/blob/main/rust/helm/optics-agent/templates/processor-statefulset.yaml#L54-L74)
- [Kathy](https://github.com/celo-org/optics-monorepo/blob/main/rust/helm/optics-agent/templates/kathy-statefulset.yaml#L54-L74)

To run an agent, you can use the following command: 
`BASE_CONFIG=kovan_config.json env $(cat ../tmp.env | xargs) cargo run --bin <AGENT>`

This will build the codebase and run the specified `<AGENT>` binary using the provided environment variables. 

## Production Builds

It is important when making changes to the Rust codebase, to ensure the Docker build used in production environments still works. You can check this automatically in CI as it is built on every PR ([see docker workflow here](https://github.com/celo-org/optics-monorepo/blob/main/.github/workflows/docker.yml)), however you can check it much faster usually by attempting to build it locally. 

You can build the docker image by running the following script in the `rust` directory: 

`./build.sh latest`

If that goes smoothly, you can rest assured it will most likely also work in CI. 
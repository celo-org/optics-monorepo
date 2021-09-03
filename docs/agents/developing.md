# Developing the Agents

## Configuration 

- Configuration Precedence 
  - Config Files
  - Env Vars 

- Sample Config for Local Dev 

## Building an Agent 

For contributing to the Rust codebase, it is advantageous and preferrable to build agents using your host dev environment. As mentioned in the previous section, configuration precedence is your friend here. You can specify the base config json to use, and then override variables via the environment.

Below is a sample `tmp.env` file with apropriate variables to run an agent instance of `kathy`. 

Note: You will need to fetch dev keys (or generate your own via a contract deployment) for this to work properly. 



`BASE_CONFIG=kovan_config.json env $(cat ../tmp.env | xargs) cargo run --bin kathy`
#!/usr/bin/python3
# keymaster.py
# Used to perform agent wallet maintenance like: 
# top-up - ensures configured addresses have sufficient funds

from utils import dispatch_signed_transaction
from web3 import Web3
import click
import logging
from config import load_config
from utils import create_transaction, is_wallet_below_threshold, get_nonce, get_balance
import json 
import sys 
import time

@click.group()
@click.option('--debug/--no-debug', default=False)
@click.option('--config-path', default="./keymaster.json")
@click.pass_context
def cli(ctx, debug, config_path):
    ctx.ensure_object(dict)
    ctx.obj['DEBUG'] = debug

    conf = load_config(config_path)

    if conf:
        ctx.obj['CONFIG'] = conf
    else: 
        # Failed to load config, barf 
        click.echo(f"Failed to load config from {config_path}, check the file and try again.")
        sys.exit(1)

    
    # Set up logging
    logging.basicConfig(stream=sys.stdout, level=logging.INFO)

    if debug:
        click.echo(f"Loaded config from {config_path}")
        click.echo(json.dumps(ctx.obj['CONFIG'], indent=2))


@cli.command()
@click.pass_context
def top_up(ctx):
    click.echo(f"Debug is {'on' if ctx.obj['DEBUG'] else 'off'}")
    config = ctx.obj["CONFIG"]
    transaction_queue = {}
    # Init transaction queue for each network
    for network in config["networks"]:
        transaction_queue[network] = []

    for home in config["homes"]:
        
        for role, address in config["homes"][home]["addresses"].items():
            logging.info(f"Processing {role}-{address} on {home}")    
            # fetch config params 
            home_threshold = config["networks"][home]["threshold"]
            home_endpoint = config["networks"][home]["endpoint"]
            home_bank_signer = config["networks"][home]["bank"]["signer"]
            home_bank_address = config["networks"][home]["bank"]["address"]
            
            # check if balance is below threshold at home
            threshold_difference = is_wallet_below_threshold(address, home_threshold, home_endpoint)
            # get nonce
            home_bank_nonce = get_nonce(home_bank_address, home_endpoint)
            
            if threshold_difference:
                logging.info(f"Threshold difference is {threshold_difference} for {role}-{address} on {home}, enqueueing transaction.")
                # if so, enqueue top up with (threshold - balance) ether
                transaction = create_transaction(home_bank_signer, address, threshold_difference, home_bank_nonce + len(transaction_queue[home]), home_endpoint)
                transaction_queue[home].append(transaction)
            else: 
                logging.info(f"Threshold difference is satisfactory for {role}-{address} on {home}, no action.")

            for replica in config["homes"][home]["replicas"]:
                 # fetch config params 
                replica_threshold = config["networks"][replica]["threshold"]
                replica_endpoint = config["networks"][replica]["endpoint"]
                replica_bank_signer = config["networks"][replica]["bank"]["signer"]
                replica_bank_address = config["networks"][replica]["bank"]["address"]
                # check if balance is below threshold at replica
                threshold_difference = is_wallet_below_threshold(address, replica_threshold, replica_endpoint)
                # get nonce
                replica_bank_nonce = get_nonce(replica_bank_address, replica_endpoint)
                # if so, enqueue top up with (threshold - balance) ether
                if threshold_difference:
                    logging.info(f"Threshold difference is {threshold_difference} for {role}-{address} on {replica}, enqueueing transaction.")
                    transaction = create_transaction(replica_bank_signer, address, threshold_difference, replica_bank_nonce + len(transaction_queue[replica]), replica_endpoint)
                    transaction_queue[replica].append(transaction)
                else: 
                    logging.info(f"Threshold difference is satisfactory for {role}-{address} on {replica}, no action.")
    
    # compute analytics about enqueued transactions 
    click.echo("\n Transaction Stats:")
    for network in transaction_queue:
        if len(transaction_queue[network]) > 0:
            amount_sum = sum(tx[0]["value"] for tx in transaction_queue[network])
            bank_balance = get_balance(config["networks"][network]["bank"]["address"], config["networks"][network]["endpoint"])
            click.echo(f"\t {network} Bank has {Web3.fromWei(bank_balance, 'ether')} ETH")
            click.echo(f"\t About to send {len(transaction_queue[network])} transactions on {network} - Total of {Web3.fromWei(amount_sum, 'ether')} ETH \n")

            click.confirm("Would you like to proceed with dispatching these transactions?", abort=True)

            # Process enqueued transactions 
            click.echo(f"Processing transactions for {network}")
            for transaction_tuple in transaction_queue[network]:
                click.echo(f"Attempting to send transaction: {json.dumps(transaction_tuple[0], indent=2, default=str)}")
                hash = dispatch_signed_transaction(transaction_tuple[1], config["networks"][network]["endpoint"])
                click.echo(f"Dispatched Transaction: {hash}")
                time.sleep(3)
        else: 
            click.echo(f"\t No transactions to process for {network}, continuing...")

    

if __name__ == '__main__':
    cli(obj={})
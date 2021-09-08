from web3 import Web3

# Checks if an address is below the threshold
# returns difference in wei if true
# returns False if not
def is_wallet_below_threshold(address:str, threshold:int, endpoint:str):
    w3 = Web3(Web3.HTTPProvider(endpoint))
    address = Web3.toChecksumAddress(address)
    # get balance
    wallet_wei = w3.eth.get_balance(address)
    # if balance below threshold
    if wallet_wei < threshold:
        return threshold - wallet_wei
    else: 
        return False

# gets the current nonce for an address 
def get_nonce(address:str, endpoint:str):
    w3 = Web3(Web3.HTTPProvider(endpoint))
    address = Web3.toChecksumAddress(address)
    nonce = w3.eth.get_transaction_count(address)
    return nonce

def get_balance(address:str, endpoint:str):
    w3 = Web3(Web3.HTTPProvider(endpoint))
    address = Web3.toChecksumAddress(address)
    wallet_wei = w3.eth.get_balance(address)
    return wallet_wei

# creates a transaction for a sender and recipient
# given a network RPC endpoint
# returns tuple (tx_params, signed_tx) for debugging
def create_transaction(sender_key:str, recipient_address:int, amount:int, nonce:int, endpoint:str):
    # Set up w3 provider with network endpoint
    w3 = Web3(Web3.HTTPProvider(endpoint))
    recipient_address = Web3.toChecksumAddress(recipient_address)
    chain_id = w3.eth.chain_id
    gas = 100000 * 100 if "arb-rinkeby" in endpoint else 100000 
    # sign transaction 
    tx_params = dict(
        nonce=nonce,
        gasPrice= 500 * 10 ** 9,
        gas=gas,
        to=recipient_address,
        value=amount,
        data=b'',
        chainId=chain_id,
    )
    signed_txn = w3.eth.account.sign_transaction(tx_params,sender_key)
    return (tx_params, signed_txn)

# dispatches a signed transaction from create_transaction
def dispatch_signed_transaction(signed_transaction, endpoint:str):
    # Set up w3 provider with network endpoint
    w3 = Web3(Web3.HTTPProvider(endpoint))
    hash = w3.eth.send_raw_transaction(signed_transaction.rawTransaction)  
    return hash
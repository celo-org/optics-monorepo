# Investigating Stuck Bridge Transactions with Cast

This guide shows you how to debug stuck Optics bridge transactions using Foundry's `cast` command-line tool.

## Prerequisites

1. Install Foundry: `curl -L https://foundry.paradigm.xyz | bash && foundryup`
2. Get an Ethereum RPC endpoint (e.g., Infura, Alchemy, or your own node)
3. Have your transaction details ready

## Step-by-Step Investigation

### Step 0: Set Your RPC Endpoint

```bash
export ETH_RPC="https://mainnet.infura.io/v3/YOUR_API_KEY"
```

Or use `--rpc-url` flag in each command.

---

## 🔍 PART 1: Analyze Source Chain Transaction (Celo)

### 1.1 Get Transaction Receipt

```bash
# For Celo mainnet
cast receipt 0xYOUR_TX_HASH \
  --rpc-url https://internal-forno.dont-share.rc1-us-west1.celo-testnet.org
```

**What to look for:**
- ✅ `status: 1` = Transaction succeeded
- ❌ `status: 0` = Transaction failed (nothing was sent)
- Extract the block number for reference

### 1.2 Find the Dispatch Event

Look in the logs for the `Dispatch` event from the Home contract.

**Event signature**: `0x9d4c83d2e57d7d381feb264b44a5015e7f9ef26340f4fc46b558a6dc16dd811a`

**From logs, extract:**
- **Topic 1**: Message Hash
- **Topic 2**: Leaf Index (THIS IS CRITICAL!)
- **Topic 3**: Destination and Nonce (packed)
- **Data**: Committed Root + Message bytes

💡 **Tip**: Use the Python script `extract-message-details.py` to automatically parse this!

```bash
python3 extract-message-details.py 0xYOUR_TX_HASH
```

---

## 🔍 PART 2: Check Destination Chain Status (Ethereum)

### Contract Addresses

For **production-community** deployment:
- **Celo Home**: `0x913EE05036f3cbc94Ee4afDea87ceb430524648a`
- **Ethereum Replica**: `0x27658c5556A9a57f96E69Bbf6d3B8016f001a785`

For **mainnet** deployment:
- **Celo Home**: `0x97bbda9A1D45D86631b243521380Bc070D6A4cBD`
- **Ethereum Replica**: `0x07b5B57b08202294E657D51Eb453A189290f6385`

### 2.1 Check Replica State

```bash
cast call 0x27658c5556A9a57f96E69Bbf6d3B8016f001a785 \
  "state()(uint8)" \
  --rpc-url $ETH_RPC
```

**Expected values:**
- `0` = UnInitialized (should never happen)
- `1` = ✅ **Active** (working normally)
- `2` = ❌ **Failed** (system halted, needs governance intervention)

⚠️ **If state = 2 (Failed)**: The replica is in failed state and won't process ANY messages. This requires governance action to recover. Stop here and contact the operations team.

### 2.2 Check if Root Has Been Relayed

```bash
# Replace with YOUR committed root from Step 1.2
cast call 0x27658c5556A9a57f96E69Bbf6d3B8016f001a785 \
  "confirmAt(bytes32)(uint256)" \
  0xYOUR_COMMITTED_ROOT \
  --rpc-url $ETH_RPC
```

**Expected values:**
- `0` = ❌ Root has NOT been relayed yet (stuck at relayer)
- `> 0` = ✅ Unix timestamp when root becomes confirmable

**If you get a timestamp:**
```bash
# Convert to human-readable date
date -r 1643278944  # On macOS
date -d @1643278944  # On Linux
```

**Check if confirmed:**
- If timestamp is in the past → ✅ Root is confirmed
- If timestamp is in the future → ⏳ Wait for acceptance period (~3 hours)

### 2.3 Check Message Status

```bash
# Replace with YOUR message hash from Step 1.2
cast call 0x27658c5556A9a57f96E69Bbf6d3B8016f001a785 \
  "messages(bytes32)(uint8)" \
  0xYOUR_MESSAGE_HASH \
  --rpc-url $ETH_RPC
```

**Expected values:**
- `0` = None (not proven yet) → **STUCK: Need to replay**
- `1` = Proven (not processed yet) → **STUCK: Need to process**
- `2` = Processed → ✅ **COMPLETE!**

---

## 📊 Decision Tree

Based on the results above, here's what each scenario means:

### Scenario A: Root confirmAt = 0
```
✅ Celo TX succeeded
❌ Root NOT relayed to Ethereum
```
**Problem**: Relayer hasn't submitted the root  
**Action**: Check relayer agent status, or wait for it to catch up

### Scenario B: Root confirmed, Message status = 0
```
✅ Celo TX succeeded
✅ Root relayed and confirmed
❌ Message NOT proven
```
**Problem**: Processor never proved the message (your case!)  
**Action**: Use prove-cli to manually prove and process

### Scenario C: Message status = 1
```
✅ Celo TX succeeded
✅ Root relayed and confirmed
✅ Message proven
❌ Message NOT processed
```
**Problem**: Message proven but final processing didn't complete  
**Action**: Use prove-cli to process (or call `process()` directly)

### Scenario D: Message status = 2
```
✅ Celo TX succeeded
✅ Root relayed and confirmed
✅ Message proven
✅ Message processed
```
**Problem**: None! Transaction completed successfully  
**Action**: Check recipient balance on Ethereum

---

## 🔧 PART 3: Manual Replay (If Stuck)

If your message is stuck (status 0 or 1), you can replay it:

### Requirements
1. ✅ Synced processor database (contains merkle tree and proofs)
2. ✅ Private key with ETH for gas
3. ✅ Leaf index from Step 1.2

### Using prove-cli

```bash
cd rust

# Build the CLI
cargo build --release --bin optics-cli

# Replay the message
cargo run --release --bin optics-cli -- prove \
  --home-name celo \
  --db-path /path/to/processor/db \
  --leaf-index YOUR_LEAF_INDEX \
  --rpc $ETH_RPC \
  --address 0x27658c5556A9a57f96E69Bbf6d3B8016f001a785 \
  --key YOUR_PRIVATE_KEY
```

The CLI will automatically:
1. Load message and proof from database
2. Check current status
3. Call `proveAndProcess()` if status = 0
4. Call `process()` if status = 1
5. Exit if status = 2

### Alternative: Direct Cast Call (Advanced)

If you have the message bytes and proof, you can call directly:

```bash
cast send 0x27658c5556A9a57f96E69Bbf6d3B8016f001a785 \
  "proveAndProcess(bytes,bytes32[32],uint256)" \
  "0xMESSAGE_BYTES" \
  "[PROOF_ARRAY]" \
  LEAF_INDEX \
  --rpc-url $ETH_RPC \
  --private-key $PRIVATE_KEY
```

⚠️ This requires manually constructing the proof array, which is complex. Use prove-cli instead.

---

## 🎯 Quick Reference Commands

### Full Investigation Script

```bash
#!/bin/bash

# Configuration
ETH_RPC="https://mainnet.infura.io/v3/YOUR_API_KEY"
REPLICA="0x27658c5556A9a57f96E69Bbf6d3B8016f001a785"
COMMITTED_ROOT="0xYOUR_ROOT_FROM_CELO"
MESSAGE_HASH="0xYOUR_MESSAGE_HASH"

echo "=== REPLICA STATE ==="
STATE=$(cast call $REPLICA "state()(uint8)" --rpc-url $ETH_RPC)
case $STATE in
  0) echo "UnInitialized (shouldn't happen)" ;;
  1) echo "✅ Active" ;;
  2) echo "❌ Failed - System halted!" ;;
esac

echo -e "\n=== ROOT STATUS ==="
CONFIRM_AT=$(cast call $REPLICA "confirmAt(bytes32)(uint256)" $COMMITTED_ROOT --rpc-url $ETH_RPC)
if [ "$CONFIRM_AT" = "0" ]; then
  echo "❌ Root NOT relayed"
else
  echo "✅ Root relayed, confirmable at: $(date -r $CONFIRM_AT 2>/dev/null || date -d @$CONFIRM_AT)"
  NOW=$(date +%s)
  if [ $NOW -ge $CONFIRM_AT ]; then
    echo "✅ Root is confirmed"
  else
    echo "⏳ Waiting for acceptance period"
  fi
fi

echo -e "\n=== MESSAGE STATUS ==="
MSG_STATUS=$(cast call $REPLICA "messages(bytes32)(uint8)" $MESSAGE_HASH --rpc-url $ETH_RPC)
case $MSG_STATUS in
  0) echo "❌ Not proven - Use prove-cli to replay" ;;
  1) echo "⚠️  Proven but not processed - Use prove-cli to process" ;;
  2) echo "✅ Processed - Transaction complete!" ;;
esac
```

---

## 📝 Example: Real Investigation

Here's the investigation of transaction `0xf3db12c4aeefe550a5a035e32294a5ea040e965fffc23753b478780761608969`:

```bash
# Step 1: Extract message details
python3 extract-message-details.py 0xf3db12c4aeefe550a5a035e32294a5ea040e965fffc23753b478780761608969

# Output:
# Leaf Index: 1996
# Message Hash: 0x1118dab37c42b489cfa3682ea2b76eac6de0e2d16a966aeb73b7697377a605b9
# Committed Root: 0x3dfeee5195f4b182ef3655a8ddb481236a06fefed17c94b77889a32edad7dc09

# Step 2: Check Replica state
cast call 0x27658c5556A9a57f96E69Bbf6d3B8016f001a785 "state()(uint8)" \
  --rpc-url https://mainnet.infura.io/v3/c1693300643f48729a9ee20cc5142884
# Result: 1 (Active) ✅

# Step 3: Check root status
cast call 0x27658c5556A9a57f96E69Bbf6d3B8016f001a785 \
  "confirmAt(bytes32)(uint256)" \
  0x3dfeee5195f4b182ef3655a8ddb481236a06fefed17c94b77889a32edad7dc09 \
  --rpc-url https://mainnet.infura.io/v3/c1693300643f48729a9ee20cc5142884
# Result: 1643278944 (Thu Jan 27 2022) ✅ - Confirmed!

# Step 4: Check message status
cast call 0x27658c5556A9a57f96E69Bbf6d3B8016f001a785 \
  "messages(bytes32)(uint8)" \
  0x1118dab37c42b489cfa3682ea2b76eac6de0e2d16a966aeb73b7697377a605b9 \
  --rpc-url https://mainnet.infura.io/v3/c1693300643f48729a9ee20cc5142884
# Result: 0 (Not proven) ❌

# CONCLUSION: Message stuck at processor, needs manual replay!
```

---

## 🆘 Troubleshooting

### Cast command crashes
- Update Foundry: `foundryup`
- Try using curl + python scripts instead (see other guides)

### "execution reverted" errors
- Check you're using the correct contract address
- Check you're on the right network
- If checking messages/confirmAt: value might not exist (returns 0 or reverts)

### Can't find leaf index
- Use `extract-message-details.py` script
- Manually parse the Dispatch event logs
- Contact ops team with transaction hash

### Need processor database
- Ask operations team for access
- Run your own processor to sync the database
- Check if someone else can replay for you (it's permissionless!)

---

## 📚 Related Resources

- [TRANSACTION_ANALYSIS.md](./TRANSACTION_ANALYSIS.md) - Detailed analysis of your transaction
- [DEBUG_STUCK_TRANSACTIONS.md](./DEBUG_STUCK_TRANSACTIONS.md) - Comprehensive debugging guide
- [Optics Architecture](../../docs/architecture.md) - How Optics works
- [Failure Cases](../../docs/failure-cases.md) - Known failure scenarios

---

## 💡 Pro Tips

1. **Always check in order**: State → Root → Message. If an earlier step fails, the later steps won't work.

2. **Save your findings**: Keep track of leaf index, message hash, and root hash. You'll need them for replay.

3. **Permissionless replay**: Anyone can replay stuck messages if they have the processor database. Help others!

4. **Check multiple transactions**: If one is stuck, others from the same time period might be too.

5. **Monitor relayer health**: If roots aren't being relayed, check relayer agent status.

---

**Questions?** See the main [README.md](./README.md) or create an issue in the repo.


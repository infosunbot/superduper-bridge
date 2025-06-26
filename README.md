
#  Superduper Cross-Chain Bridge (Take-Home Challenge)

This project implements a simplified **lock-and-mint cross-chain bridge** for transferring an ERC-20 token ("SuperToken") between two EVM-compatible testnets: **Ethereum Sepolia (Chain A)** and **Arbitrum Sepolia (Chain B)**.

---

## Monorepo Structure

```
superduper-bridge/
├── contracts/        # Hardhat project (Solidity contracts)
├── scripts/          # Deployment and interaction scripts
├── test/             # Unit tests
├── relayer/          # TypeScript relayer service
├── README.md         # You're here
├── .env.example      # Config template for contracts
└── relayer/.env.example # Config template for relayer
```

> Both the Hardhat project and relayer can be run independently, but are delivered together in a single monorepo for clarity and integration.

---

##  Features

- Custom ERC-20 (`SuperToken`) deployed on Chain A
- Mintable bridged token (`SuperTokenB`) on Chain B
- Lock-and-mint bridging mechanism via `BridgeA` and `BridgeB`
- TypeScript relayer that watches events and triggers release
- Fully testable and deployable across Sepolia and Arbitrum Sepolia

---

## Architecture Summary

| Component     | Description |
|---------------|-------------|
| `SuperToken`  | ERC-20 token on Chain A |
| `BridgeA`     | Locks tokens, emits event with `nonce` |
| `SuperTokenB` | Mintable token on Chain B |
| `BridgeB`     | Verifies signature + received nonce, mints tokens |
| `Relayer`     | Listens on Chain A, signs messages with received `nonce`, sends tx to Chain B |

---

## Contract Usage & Testing

### Sample Hardhat Commands

```bash
npx hardhat help
npx hardhat test
npx hardhat node
REPORT_GAS=true npx hardhat test
```

---

## Unit Testing

Install:
```bash
npm install --save-dev chai @nomicfoundation/hardhat-chai-matchers
```

Run:
```bash
npx hardhat test
```

 Expected Output:
```
 SuperToken Cross-Chain Bridge
    ✔ should lock tokens on BridgeA
    ✔ should release tokens on BridgeB with valid signature
    ✔ should reject reused nonces
    ✔ should reject releaseTokens with invalid signer
    ✔ should revert if relayer is not set and release is attempted
    ✔ should reject reused signature with different nonce
```

---

## Bonus: E2E Simulation

File: `scripts/simulateE2E.js`

✔ Deploys all contracts  
✔ Locks tokens on Chain A  
✔ Simulates relayer signature  
✔ Releases tokens on Chain B  
✔ Confirms final balances

Sample Run:
```
npx hardhat run scripts/simulateE2E.js --network chainA

Owner: 0xf3...
User: 0x70...
Relayer: 0x3C...

 Locking tokens on BridgeA...
 Releasing tokens on BridgeB...
 Final SuperTokenB Balance: 50.0 SUPB
```

---

##  Deployment to Testnets

### Chain A: Sepolia
```bash
npx hardhat run scripts/deployA.js --network chainA
```
Output:
```
SuperToken deployed to: 0xC574...
BridgeA deployed to: 0x7aB2...
```

### Chain B: Arbitrum Sepolia
```bash
npx hardhat run scripts/deployB.js --network chainB
```
Output:
```
SuperTokenB deployed to: 0xD356...
BridgeB deployed to: 0x23AC...
Relayer address set to: 0xd0aa...
```

 Copy these addresses into your `relayer/.env`.

---

## Token Lock + Release in Action

### Lock Script
```bash
npx hardhat run scripts/lockTokens.js --network chainA
```
Output:
```
User balance: 500000.0
 Approving BridgeA...
Allowance: 10.0
Locking tokens...
Locked tokens!
```

### Relayer Console
```
Relayer started. Listening for lock events...
Lock Event: sender=0xd0a..., amount=10.0, nonce=1
Released 10.0 tokens → tx: 0x2b0b...
```

---

## Nonce Design & Mitigation

| Step        | Action |
|-------------|--------|
| BridgeA     | Emits `TokensLocked(..., nonce)` with incrementing counter |
| Relayer     | Reads nonce, signs message with nonce |
| BridgeB     | Verifies nonce, mints token, marks nonce used |

###  Long-Term Considerations

**Problem**: On-chain nonce tracking could grow too large over time.

### Suggested Mitigations:

1. **Expire Old Nonces (Time-Based)**
   - Store timestamps with nonces
   - Clear nonces older than N blocks/days
   - Risk: Late-arriving messages may fail

2. **External Nonce Registry**
   - Track nonces off-chain (e.g. ZK-verifiable log)
   - BridgeB reads validation proof
   - Lower gas, but added complexity

---

## Relayer Design Reflection

The relayer is implemented as a single-process event-driven listener, with minimal dependencies and full EVM compatibility via `ethers.js`.

**Strengths:**
- Fully functional lock-and-release pipeline
- Clear separation between Chain A and Chain B logic
- Proper nonce replay protection and signature validation

**Potential Improvements for Production:**
- Modularization into service, signer, processor components
- Add retry queue for failed `releaseTokens` txs
- Track processed nonces in file/DB to survive restarts
- Swap `console.log` for structured logger (e.g., `pino`)
- Integrate health/liveness checks for reliability

> For the purpose of this take-home, simplicity was favored over system complexity, while maintaining clarity and correctness.

---

## Environment Setup

You must create two `.env` files based on the provided templates:

- Root `.env.example` (for Hardhat and contract deployment)
- `relayer/.env.example` (for the TypeScript relayer)

```env
# Example .env
PRIVATE_KEY=
CHAIN_A_RPC=
CHAIN_B_RPC=
BRIDGE_A_ADDRESS=
BRIDGE_B_ADDRESS=
```

```
.env
relayer/.env
```


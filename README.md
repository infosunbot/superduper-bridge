
#  Superduper Cross-Chain Bridge POC

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

---

## Smart Contract Design Explanations

- **BridgeA.sol** handles token locking via `transferFrom`, and emits a `TokensLocked` event that includes a `nonce` to uniquely identify each transfer. This event acts as a proof of intent for the relayer.
- **BridgeB.sol** verifies off-chain signed messages using `ECDSA`, minting tokens to recipients only if the message was signed by an authorized relayer and the `nonce` has not been processed before.
- `onlyRelayer` access control was chosen to simplify relayer authorization without requiring complex role management.

## Contract Usage & Testing

### Sample Hardhat Commands

```bash
npx hardhat help
npx hardhat test
npx hardhat node
REPORT_GAS=true npx hardhat test
```

---

## Environment Setup

You must create two `.env` files based on the provided templates below:

- Root `.env.example` (for Hardhat and contract deployment)
- `relayer/.env.example` (for the TypeScript relayer)

```env
# Example .env
PRIVATE_KEY=your_private_key_here
CHAIN_A_RPC=https://sepolia.infura.io/v3/<your_project_id>
CHAIN_B_RPC=https://arbitrum-sepolia.infura.io/v3/<your_project_id>
BRIDGE_A_ADDRESS=0x7aB274efD0Fe44E81F6bB8120F595DAfbD569212
BRIDGE_B_ADDRESS=0x23AC5fA420941cF13DdAe778Ec51Be7f8840269A
```

```
.env
relayer/.env
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
BridgeA token balance after lock: 10.0
    ✔ should lock tokens on BridgeA
User balance on Chain B after release: 10.0
    ✔ should release tokens on BridgeB with valid signature
    ✔ should reject reused nonces
    ✔ should reject releaseTokens with invalid signer
    ✔ should revert if relayer is not set and release is attempted
    ✔ should reject reused signature with different nonce
```

---

##  E2E Simulation

File: `scripts/simulateE2E.js`

✔ Deploys all contracts  
✔ Locks tokens on Chain A  
✔ Simulates relayer signature  
✔ Releases tokens on Chain B  
✔ Confirms final balances

Sample Run:
```
npx hardhat run scripts/simulateE2E.js 

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

---

## Security Considerations

| Area              | Current Approach         | Production Alternative                     |
|-------------------|--------------------------|---------------------------------------------|
| Relayer Trust     | Single trusted signer    | Multi-sig, validator network, threshold sigs |
| Replay Protection | Nonce map on-chain       | Merkle root, off-chain ZKP verifier         |
| Signature Auth    | ECDSA                    | Aggregated, multi-party, or ZK-based        |
| Mint Control      | onlyRelayer              | Role-based access control, timelocks        |

This simplified bridge design prioritizes clarity and demonstrability. A production-grade bridge would require a more trustless and decentralized architecture to minimize the attack surface and reduce reliance on a single relayer.

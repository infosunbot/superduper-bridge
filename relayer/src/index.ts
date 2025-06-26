import { ethers } from "ethers";
import * as dotenv from "dotenv";
import BridgeAJson from "./abi/BridgeA.json";
import BridgeBJson from "./abi/BridgeB.json";

dotenv.config();

const {
  CHAIN_A_RPC,
  CHAIN_B_RPC,
  PRIVATE_KEY,
  BRIDGE_A_ADDRESS,
  BRIDGE_B_ADDRESS
} = process.env;

type LockEvent = {
  sender: string;
  amount: bigint;
  recipientOnChainB: string;
  nonce: bigint;
};

const processedNonces = new Set<string>();

async function main() {
  const providerA = new ethers.JsonRpcProvider(CHAIN_A_RPC);
  const providerB = new ethers.JsonRpcProvider(CHAIN_B_RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY!, providerB); // Sign + send txs to Chain B

  const bridgeA = new ethers.Contract(BRIDGE_A_ADDRESS!, BridgeAJson.abi, providerA);
  const bridgeB = new ethers.Contract(BRIDGE_B_ADDRESS!, BridgeBJson.abi, wallet);

  console.log(" Relayer started. Listening for lock events...");

  bridgeA.on("TokensLocked", async (sender, amount, recipientOnChainB, nonce) => {
    const key = `${recipientOnChainB}-${nonce}`;
    // Avoid reprocessing already handled events
    if (processedNonces.has(key)) return;
    processedNonces.add(key);

    console.log(` Lock Event: sender=${sender}, amount=${ethers.formatEther(amount)}, nonce=${nonce}`);
    // Construct the message hash that BridgeB expects to verify
    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "uint256", "uint256", "address"],
      [recipientOnChainB, amount, nonce, BRIDGE_B_ADDRESS]
    );
    // Sign message with relayer's private key (used for verification on BridgeB)
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));

    try {
      const tx = await bridgeB.releaseTokens(recipientOnChainB, amount, nonce, signature);
      console.log(` Released ${ethers.formatEther(amount)} tokens → tx: ${tx.hash}`);
    } catch (err) {
      // Log error without crashing service
      console.error(`Failed to release tokens:`, err);
    }
  });
}

main().catch(console.error);

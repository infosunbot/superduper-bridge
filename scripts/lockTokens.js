const { ethers } = require("hardhat");
require("dotenv").config();

async function main() {
  const user = new ethers.Wallet(process.env.PRIVATE_KEY, ethers.provider);
  const bridgeA = await ethers.getContractAt("BridgeA", process.env.BRIDGE_A_ADDRESS, user);
  const tokenAddress = await bridgeA.token();
  const token = await ethers.getContractAt("SuperToken", tokenAddress, user);

  const amount = ethers.parseEther("10");

  const balance = await token.balanceOf(user.address);
  console.log("User balance:", ethers.formatEther(balance));
  if (balance < amount) throw new Error(" Insufficient token balance");

  console.log(" Approving BridgeA...");
  const approvalTx = await token.approve(await bridgeA.getAddress(), amount);
  await approvalTx.wait();

  await new Promise(resolve => setTimeout(resolve, 3000));

  const allowance = await token.allowance(user.address, bridgeA.getAddress());
  console.log("Allowance:", ethers.formatEther(allowance));

  console.log("Locking tokens...");
  const tx = await bridgeA.lockTokens(amount, user.address);
  await tx.wait();

  console.log("Locked tokens!");
}

main().catch(console.error);

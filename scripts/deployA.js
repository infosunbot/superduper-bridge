// Ethers v6

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying from:", deployer.address);

  const SuperToken = await ethers.getContractFactory("SuperToken");
  const token = await SuperToken.deploy();
  await token.waitForDeployment();

  const BridgeA = await ethers.getContractFactory("BridgeA");
  const bridge = await BridgeA.deploy(await token.getAddress());
  await bridge.waitForDeployment();

  console.log("SuperToken deployed to:", await token.getAddress());
  console.log("BridgeA deployed to:", await bridge.getAddress());

  await token.transfer(await bridge.getAddress(), ethers.parseEther("500000"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

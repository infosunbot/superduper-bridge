// Ethers v6

const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying from:", deployer.address);

  // Deploy SuperTokenB
  const SuperTokenB = await ethers.getContractFactory("SuperTokenB");
  const tokenB = await SuperTokenB.deploy();
  await tokenB.waitForDeployment();
  const tokenBAddress = await tokenB.getAddress();

  // Deploy BridgeB with tokenB address
  const BridgeB = await ethers.getContractFactory("BridgeB");
  const bridgeB = await BridgeB.deploy(tokenBAddress);
  await bridgeB.waitForDeployment();
  const bridgeBAddress = await bridgeB.getAddress();

  // Set bridge in tokenB
  await tokenB.setBridge(bridgeBAddress);

  // Optionally: Set relayer (update address as needed)
  const relayerAddress = "0xd0aa14DC78B7143f008172938E4c0FE02fB4F816"; 
  await bridgeB.setRelayer(relayerAddress);

  console.log("SuperTokenB deployed to:", tokenBAddress);
  console.log("BridgeB deployed to:", bridgeBAddress);
  console.log("Relayer address set to:", relayerAddress);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

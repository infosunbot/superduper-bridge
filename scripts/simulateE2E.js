const { ethers } = require("hardhat");

async function main() {
  const signers = await ethers.getSigners();
  const owner = signers[0];
  const user = signers[1];
  const relayer = signers[2];

  console.log("Owner:", owner?.address);
  console.log("User:", user?.address);
  console.log("Relayer:", relayer?.address);

  // === Chain A Deployment ===
  const SuperToken = await ethers.getContractFactory("SuperToken");
  const tokenA = await SuperToken.deploy();
  await tokenA.waitForDeployment();
  const tokenAAddress = await tokenA.getAddress();

  const BridgeA = await ethers.getContractFactory("BridgeA");
  const bridgeA = await BridgeA.deploy(tokenAAddress);
  await bridgeA.waitForDeployment();
  const bridgeAAddress = await bridgeA.getAddress();

  await tokenA.transfer(user.address, ethers.parseEther("1000"));
  await tokenA.connect(user).approve(bridgeAAddress, ethers.parseEther("1000"));

  // === Chain B Deployment ===
  const SuperTokenBFactory = await ethers.getContractFactory("SuperTokenB");
  const tokenB = await SuperTokenBFactory.deploy();
  await tokenB.waitForDeployment();
  const tokenBAddress = await tokenB.getAddress();

  const BridgeBFactory = await ethers.getContractFactory("BridgeB");
  const bridgeB = await BridgeBFactory.deploy(tokenBAddress);
  await bridgeB.waitForDeployment();
  const bridgeBAddress = await bridgeB.getAddress();

  await tokenB.setBridge(bridgeBAddress);
  await bridgeB.setRelayer(relayer.address);

  // === Lock on BridgeA ===
  const amount = ethers.parseEther("50");
  const nonce = 0;

  console.log("\n Locking tokens on BridgeA...");
  await bridgeA.connect(user).lockTokens(amount, user.address);

  // === Relayer: Sign Message ===
  const messageHash = ethers.solidityPackedKeccak256(
    ["address", "uint256", "uint256", "address"],
    [user.address, amount, nonce, bridgeBAddress]
  );
  const signature = await relayer.signMessage(ethers.getBytes(messageHash));

  // === Release on BridgeB ===
  console.log("\n Releasing tokens on BridgeB...");
  await bridgeB.connect(user).releaseTokens(user.address, amount, nonce, signature);

  const finalBalance = await tokenB.balanceOf(user.address);
  console.log(`\n Final SuperTokenB Balance: ${ethers.formatEther(finalBalance)} SUPB`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
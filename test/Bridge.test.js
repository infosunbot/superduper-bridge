const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SuperToken Cross-Chain Bridge", function () {
  let owner, user, relayer;
  let tokenA, bridgeA, tokenB, bridgeB;
  let bridgeAAddress, bridgeBAddress;

  beforeEach(async () => {
    [owner, user, relayer] = await ethers.getSigners();

    // Deploy SuperToken and BridgeA (Chain A)
    const SuperToken = await ethers.getContractFactory("SuperToken");
    tokenA = await SuperToken.deploy();
    await tokenA.waitForDeployment();
    const tokenAAddress = await tokenA.getAddress();

    const BridgeA = await ethers.getContractFactory("BridgeA");
    bridgeA = await BridgeA.deploy(tokenAAddress);
    await bridgeA.waitForDeployment();
    bridgeAAddress = await bridgeA.getAddress();

    // Transfer tokens to user and approve BridgeA
    await tokenA.transfer(user.address, ethers.parseEther("1000"));
    await tokenA.connect(user).approve(bridgeAAddress, ethers.parseEther("1000"));

    // Deploy SuperTokenB and BridgeB (Chain B)
    const SuperTokenBFactory = await ethers.getContractFactory("SuperTokenB");
    tokenB = await SuperTokenBFactory.deploy();
    await tokenB.waitForDeployment();
    const tokenBAddress = await tokenB.getAddress();

    const BridgeBFactory = await ethers.getContractFactory("BridgeB");
    bridgeB = await BridgeBFactory.deploy(tokenBAddress);
    await bridgeB.waitForDeployment();
    bridgeBAddress = await bridgeB.getAddress();

    // Set bridge and relayer
    await tokenB.setBridge(bridgeBAddress);
    await bridgeB.setRelayer(relayer.address);

    // Debug deployment logs
    // console.log("\n=== Deployment ===");
    // console.log("SuperToken A:", tokenAAddress);
    // console.log("BridgeA:", bridgeAAddress);
    // console.log("SuperToken B:", tokenBAddress);
    // console.log("BridgeB:", bridgeBAddress);
    // console.log("Relayer:", relayer.address);
  });

  it("should lock tokens on BridgeA", async () => {
    const amount = ethers.parseEther("10");

    await expect(bridgeA.connect(user).lockTokens(amount, user.address))
      .to.emit(bridgeA, "TokensLocked")
      .withArgs(user.address, amount, user.address, 0);

    const balance = await tokenA.balanceOf(bridgeAAddress);
    console.log("BridgeA token balance after lock:", ethers.formatEther(balance));
    expect(balance).to.equal(amount);
  });

  it("should release tokens on BridgeB with valid signature", async () => {
    const amount = ethers.parseEther("10");
    const nonce = 1;

    await bridgeA.connect(user).lockTokens(amount, user.address);

    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "uint256", "uint256", "address"],
      [user.address, amount, nonce, bridgeBAddress]
    );
    const signature = await relayer.signMessage(ethers.getBytes(messageHash));

    await expect(
      bridgeB.connect(user).releaseTokens(user.address, amount, nonce, signature)
    )
      .to.emit(bridgeB, "TokensReleased")
      .withArgs(user.address, amount, nonce);

    const userBalance = await tokenB.balanceOf(user.address);
    console.log("User balance on Chain B after release:", ethers.formatEther(userBalance));
    expect(userBalance).to.equal(amount);
  });

  it("should reject reused nonces", async () => {
    const amount = ethers.parseEther("10");
    const nonce = 2;

    await bridgeA.connect(user).lockTokens(amount, user.address);

    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "uint256", "uint256", "address"],
      [user.address, amount, nonce, bridgeBAddress]
    );
    const signature = await relayer.signMessage(ethers.getBytes(messageHash));

    await bridgeB.connect(user).releaseTokens(user.address, amount, nonce, signature);

    await expect(
      bridgeB.connect(user).releaseTokens(user.address, amount, nonce, signature)
    ).to.be.revertedWith("Nonce already processed");
  });

  it("should reject releaseTokens with invalid signer", async () => {
    const amount = ethers.parseEther("10");
    const nonce = 3;

    await bridgeA.connect(user).lockTokens(amount, user.address);

    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "uint256", "uint256", "address"],
      [user.address, amount, nonce, bridgeBAddress]
    );

    const fakeSignature = await user.signMessage(ethers.getBytes(messageHash));

    await expect(
      bridgeB.connect(user).releaseTokens(user.address, amount, nonce, fakeSignature)
    ).to.be.revertedWith("Invalid signature");
  });

  it("should revert if relayer is not set and release is attempted", async () => {
    const amount = ethers.parseEther("10");
    const nonce = 4;

    await bridgeA.connect(user).lockTokens(amount, user.address);

    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "uint256", "uint256", "address"],
      [user.address, amount, nonce, bridgeBAddress]
    );
    const signature = await relayer.signMessage(ethers.getBytes(messageHash));

    await bridgeB.setRelayer(ethers.ZeroAddress);

    await expect(
      bridgeB.connect(user).releaseTokens(user.address, amount, nonce, signature)
    ).to.be.revertedWith("Invalid signature");
  });

  it("should reject reused signature with different nonce", async () => {
    const amount = ethers.parseEther("10");
    const originalNonce = 5;
    const invalidNonce = 6;

    await bridgeA.connect(user).lockTokens(amount, user.address);

    const messageHashOriginal = ethers.solidityPackedKeccak256(
      ["address", "uint256", "uint256", "address"],
      [user.address, amount, originalNonce, bridgeBAddress]
    );
    const signature = await relayer.signMessage(ethers.getBytes(messageHashOriginal));

    await expect(
      bridgeB.connect(user).releaseTokens(user.address, amount, invalidNonce, signature)
    ).to.be.revertedWith("Invalid signature");
  });
});

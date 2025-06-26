require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.28",
  networks: {
    chainA: {
      url: process.env.CHAIN_A_RPC,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 11155111 // Sepolia
    },
    chainB: {
      url: process.env.CHAIN_B_RPC,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 421614 // Arbitrum Sepolia
    },
  },
};

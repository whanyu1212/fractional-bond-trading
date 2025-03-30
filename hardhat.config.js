require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); // ✅ Ensure dotenv is loaded

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28", 
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true  // Add this line or else it cannot accommodate if there are too many local variables
    }
  },
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [
        process.env.DEPLOYER_PRIVATE_KEY,  // Deployer key
        process.env.ISSUER_PRIVATE_KEY     // Issuer key
      ],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
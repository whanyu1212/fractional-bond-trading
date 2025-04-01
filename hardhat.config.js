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
        process.env.DEPLOYER_PRIVATE_KEY,
        process.env.PLAYER1_PRIVATE_KEY,  
        process.env.PLAYER2_PRIVATE_KEY,
        process.env.PLAYER3_PRIVATE_KEY,
      ],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
require("@nomicfoundation/hardhat-toolbox");

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
};
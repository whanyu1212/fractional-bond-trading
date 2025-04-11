const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");
const BOND_CONTRACT_ARTIFACT_NAME = "TokenizedBond";
const deploymentInfoPath = path.join(__dirname, "../deployment-info.json");

// --- replace with a json file to store them ---
// --- need to be actual sepolia address ---
const DEPLOYED_ADDRESSES = {
    mockStablecoin: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    bondFactory: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    bondMarketplace: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
};
// ----------------------------------------------------

// // --- Helper function for checking and logging balances ---
// async function checkBalance(tokenContract, address, decimals, symbol, label) {
//     try {
//         const balance = await tokenContract.balanceOf(address);
//         const formattedBalance = ethers.formatUnits(balance, decimals);
//         console.log(`   - ${label} Balance (${symbol}): ${formattedBalance} (${balance.toString()} units)`);
//         return balance;
//     } catch (e) {
//         console.error(`   - Error fetching balance for ${label} (${address}): ${e.message}`);
//         return -1n; 
//     }
// }

// --- Main Script Function ---
async function main() {
    console.log("\n=== Using Hardcoded Deployment Addresses (Sepolia) ===");
    console.log(`   - MockStablecoin: ${DEPLOYED_ADDRESSES.mockStablecoin}`);
    console.log(`   - BondFactory: ${DEPLOYED_ADDRESSES.bondFactory}`);
    console.log(`   - BondMarketplace: ${DEPLOYED_ADDRESSES.bondMarketplace}`);
    console.log("====================================================");

    // === Get Signers ===
    const [deployer, player1, player2, player3, player4, player5] = await ethers.getSigners();
    const playerSigners = [player1, player2, player3, player4, player5];
    const [p1, p2, p3, p4, p5] = playerSigners; 
    console.log("\n=== Signers Retrieved (Check if these match expected accounts) ===");
    console.log("Current Script Deployer/Signer 0:", deployer.address);
    playerSigners.forEach((p, i) => console.log(`Player ${i + 1}: ${p.address}`));
    console.log("====================================================");

    // === Get Deployed Contract Instances ===
    console.log("\n=== Attaching to Deployed Contracts ===");
    let mockStablecoin, bondFactory, bondMarketplace, stablecoinSymbol, stablecoinDecimals;
    try {
        mockStablecoin = await ethers.getContractAt("MockStablecoin", DEPLOYED_ADDRESSES.mockStablecoin);
        bondFactory = await ethers.getContractAt("BondFactory", DEPLOYED_ADDRESSES.bondFactory);
        bondMarketplace = await ethers.getContractAt("BondMarketPlace", DEPLOYED_ADDRESSES.bondMarketplace);
        stablecoinSymbol = await mockStablecoin.symbol();
        stablecoinDecimals = await mockStablecoin.decimals();
        console.log(`   - Attached to ${stablecoinSymbol} at ${await mockStablecoin.getAddress()}`);
        console.log(`   - Attached to BondFactory at ${await bondFactory.getAddress()}`);
        console.log(`   - Attached to BondMarketplace at ${await bondMarketplace.getAddress()}`);
    } catch (attachError) {
        console.error("❌ Error attaching to deployed contracts:", attachError);
        console.error("   Ensure addresses are correct and ABIs (contract names) match the deployed code.");
        process.exit(1);
    }
    console.log("====================================================");

    console.log("\nInteraction script finished.");
} 

main()
    .then(() => {
        console.log("\nScript completed successfully.");
        process.exit(0); 
    })
    .catch((error) => {
        console.error("💥 Interaction script failed:", error);
        process.exitCode = 1; 
        process.exit(1); 
    });
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

async function main() {
    // Get the current timestamp
    // Do not use Date.now() as it will not match the blockchain time
    const currentTimestamp = await time.latest();
    
    // Synthetic values
    const faceValue = ethers.parseUnits("1000", 6);  // 1000 USDC (6 decimals)
    const couponRate = 500;  // 5.00% (in basis points)
    const couponFrequency = 2;  // Semi-annual payments
    const maturityDate = currentTimestamp + (365 * 24 * 60 * 60);  // 1 year from now
    const tokensPerBond = ethers.parseUnits("1000", 18);  // 1000 tokens per bond
    const bondPrice = ethers.parseUnits("950", 6);  // 950 USDC (slight discount)
    const maxBondSupply = ethers.parseUnits("1000000", 6); // 1,000,000 bonds

    // Get signer for issuer address
    const [deployer] = await ethers.getSigners();
    const issuerAddress = await deployer.getAddress();

    // Deploy MockStablecoin first
    const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
    const mockStablecoin = await MockStablecoin.deploy("Mock USDC", "USDC");
    await mockStablecoin.waitForDeployment();
    
    const mockStablecoinAddress = await mockStablecoin.getAddress();
    console.log("MockStablecoin deployed to:", mockStablecoinAddress);

    // Then deploy TokenizedBond using the mock address
    const TokenizedBond = await ethers.getContractFactory("TokenizedBond");
    const tokenizedBond = await TokenizedBond.deploy(
        "Test Bond",
        "TBOND",
        faceValue,
        couponRate,
        couponFrequency,
        maturityDate,
        issuerAddress,
        mockStablecoinAddress,
        tokensPerBond,
        bondPrice,
        maxBondSupply
    );

    await tokenizedBond.waitForDeployment();
    const tokenizedBondAddress = await tokenizedBond.getAddress();
    console.log("TokenizedBond deployed to:", tokenizedBondAddress);


    // Test functions
    console.log("\n--- Testing Bond Functions ---");

    // 1. Mint stablecoins
    const mintAmount = ethers.parseUnits("10000", 6);
    const contractMintAmount = ethers.parseUnits("2000", 6);
    await mockStablecoin.mint(deployer.address, mintAmount);
    await mockStablecoin.mint(tokenizedBondAddress, contractMintAmount);
    console.log("Minted stablecoins to deployer:", ethers.formatUnits(mintAmount, 6), "USDC");
    console.log("Minted stablecoins to contract:", ethers.formatUnits(contractMintAmount, 6), "USDC");

    // 2. Check initial timestamps
    console.log("\n--- Time Check ---");
    const deployTime = await time.latest();
    console.log("Current blockchain time:", deployTime);
    console.log("Maturity date:", maturityDate);
    console.log("Time until maturity:", maturityDate - deployTime, "seconds");

    // 3. Purchase bond
    await mockStablecoin.approve(tokenizedBondAddress, bondPrice);
    console.log("\nApproved bond contract to spend:", ethers.formatUnits(bondPrice, 6), "USDC");
    
    try {
        await tokenizedBond.purchaseBond(1);
        console.log("Successfully purchased 1 bond");
        
        const bondBalance = await tokenizedBond.balanceOf(deployer.address);
        console.log("Bond balance:", ethers.formatUnits(bondBalance, 18));
    } catch (error) {
        console.log("Bond purchase failed:", error.message);
        process.exit(1); // Exit if purchase fails
    }

    // 4. Wait 6 months and claim coupon
    console.log("\nAdvancing time by 6 months...");
    await time.increase(180 * 24 * 60 * 60);
    try {
        await tokenizedBond.claimCoupon();
        console.log("Claimed coupon successfully");
        
        const stablecoinBalance = await mockStablecoin.balanceOf(deployer.address);
        console.log("Stablecoin balance after coupon:", ethers.formatUnits(stablecoinBalance, 6), "USDC");
    } catch (error) {
        console.log("Coupon claim failed:", error.message);
    }

    // 5. Wait another 6 months and redeem
    console.log("\nAdvancing time by another 6 months...");
    await time.increase(185 * 24 * 60 * 60);
    try {
        await tokenizedBond.redeem();
        console.log("Redeemed bond successfully");
        
        const finalBalance = await mockStablecoin.balanceOf(deployer.address);
        console.log("Final stablecoin balance:", ethers.formatUnits(finalBalance, 6), "USDC");
    } catch (error) {
        console.log("Bond redemption failed:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
const {ethers} = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

async function main(){

    const currentTimestamp = await time.latest();
    console.log("Current timestamp:", currentTimestamp.toString());

    //------------------------ Deploying the contracts -----------------------------------------//

    /**
     * Get signers for different roles
     * deployer is the account that deploys the contract
     * issuer is the account that creates the bond
     * investor is the account that purchases the bond
     */ 
    
    const [deployer, issuer, investor] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    console.log("Issuer address:", await issuer.getAddress());
    console.log("Investor address:", await investor.getAddress());
    issuerAddress = await issuer.getAddress();

    // 1. Deploy the BondFactory contract
    const BondFactory = await ethers.getContractFactory("BondFactory");
    const bondFactory = await BondFactory.deploy();
    await bondFactory.waitForDeployment();
    console.log("BondFactory deployed to:", await bondFactory.getAddress());

    //------------------------ Synthetic values for creating the bond -----------------------------------------//

    const bondName = "Test Bond";
    const bondSymbol = "TBOND";
    const bondId = 1;
    const faceValue = ethers.parseUnits("1000", 6);  // 1000 USDC (6 decimals)
    const couponRate = 500;  // 5.00% (in basis points)
    const couponFrequency = 2;  // Semi-annual payments
    const maturityDate = currentTimestamp + (365 * 24 * 60 * 60);  // 1 year from now
    const tokensPerBond = 1000
    const bondPrice = ethers.parseUnits("950", 6);  // 950 USDC (slight discount)
    const maxBondSupply = ethers.parseUnits("1000000", 6); // 1,000,000 bonds

    //------------------------ Stablecoin -----------------------------------------//

    const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
    const mockStablecoin = await MockStablecoin.deploy("Mock USDC", "USDC");
    await mockStablecoin.waitForDeployment();
    
    const mockStablecoinAddress = await mockStablecoin.getAddress();
    console.log("MockStablecoin deployed to:", mockStablecoinAddress);


    // 4. Create a new bond as the issuer
    console.log("\n--- Creating Bond ---");
    
    // Must connect to the bond factory as the issuer
    const tx = await bondFactory.connect(issuer).createTokenizedBond(
        bondName,              // _name (1st)
        bondSymbol,            // _symbol (2nd)
        bondId,                // _id (3rd)
        faceValue,             // _faceValue (4th)
        couponRate,            // _couponRate (5th)
        couponFrequency,       // _couponFrequency (6th)
        maturityDate,          // _maturityDate (7th)
        issuerAddress,         // _issuer (8th) - this was missing!
        mockStablecoinAddress, // _stablecoinAddress (9th)
        tokensPerBond,         // _tokensPerBond (10th)
        bondPrice,             // _bondPrice (11th)
        maxBondSupply           // _maxBondSupply (12th)    
    );

    // Wait for the transaction
    await tx.wait();

    //------------------------ Testing some view functions -----------------------------------------//
    const bondAddress = await bondFactory.getLatestBond();
    console.log("✅ Latest bond created:", bondAddress);

    const activeBool = await bondFactory.isBondActive(bondAddress);
    if (activeBool) {
        console.log("Bond is active ✅");
    }
    else {
        console.log("Bond is not active ❌");
    }

    const bondAddress_ = await bondFactory.getBondsByIssuer(issuerAddress);
    console.log("Bonds created by issuer:", bondAddress_);

    const bondRecord = await bondFactory.getBondRecord(bondAddress);
    console.log("\n---Bond details---:", {
        name: bondRecord.name,
        symbol: bondRecord.symbol,
        active: bondRecord.active,
        creationTimestamp: bondRecord.creationTimestamp.toString(),
        maturityDate: bondRecord.maturityDate.toString(),
        issuer: bondRecord.issuer,
        faceValue: ethers.formatUnits(bondRecord.faceValue, 6),
        couponRate: bondRecord.couponRate.toString(),
        maxBondSupply: bondRecord.maxBondSupply.toString()
    });
    
    //------------------------ TokenizedBond Contract -----------------------------------------//
    const TokenizedBond = await ethers.getContractFactory("TokenizedBond");
    const bond = TokenizedBond.attach(bondAddress); // So factory can interact with the bond contract and call functions

    
    //------------------------ Minting Stablecoins to both issuer and investor -----------------------------------------//
    const mintAmount = ethers.parseUnits("100000", 6); // Large enough for testing
    await mockStablecoin.mint(issuer.address, mintAmount);
    await mockStablecoin.mint(investor.address, mintAmount);
    console.log("\n---Issuer & investor received:---", ethers.formatUnits(mintAmount, 6), "USDC each");

    //------------------------ Reserves needed -----------------------------------------//
    
    const bondAmount = 10; // Planning to mint 10 bonds
    const bondFaceValue = faceValue; // 1000 USDC per bond
    const totalPrincipal = bondFaceValue * BigInt(bondAmount);

    // Calculate coupon payments
    const annualCouponRate = couponRate; // 500 basis points = 5%
    const annualCouponAmount = (totalPrincipal * BigInt(annualCouponRate)) / BigInt(10000);
    const paymentsPerYear = BigInt(couponFrequency); // 2 payments per year
    const years = BigInt(1); // 1 year until maturity
    const totalPayments = paymentsPerYear * years;
    const totalCoupons = annualCouponAmount * years;

    const totalReserveNeeded = totalPrincipal + totalCoupons;
    console.log("\n---Reserve calculation:---");
    console.log(` - Principal: ${ethers.formatUnits(totalPrincipal, 6)} USDC`);
    console.log(` - Total coupons: ${ethers.formatUnits(totalCoupons, 6)} USDC`);
    console.log(` - Total needed: ${ethers.formatUnits(totalReserveNeeded, 6)} USDC`);

    // Issuer funds the bond contract with the required reserves
    console.log("\n--- Funding Bond With Reserves ---");
    await mockStablecoin.connect(issuer).transfer(bondAddress, totalReserveNeeded);
    console.log(`Transferred ${ethers.formatUnits(totalReserveNeeded, 6)} USDC to bond contract`);

    //------------------------ Minting Bonds -----------------------------------------//
    console.log("\n--- Minting Bonds ---");
    try {
        await bond.connect(issuer).mintBond(issuer.address, bondAmount);
        console.log(`Successfully minted ${bondAmount} bonds to issuer`);
    } catch (error) {
        console.error("Failed to mint bonds:", error.message);
    }

    // Check the issuer's bond balance
    const contractBalance = await mockStablecoin.balanceOf(bondAddress);
    console.log("Bond contract stablecoin balance:", ethers.formatUnits(contractBalance, 6), "USDC");


    //------------------------ Whitelist & KYC -----------------------------------------//
    console.log("\n--- Managing Investors ---");
    await bond.connect(issuer).addToWhitelist([investor.address]);
    console.log("Added investor to whitelist");
    
    await bond.connect(issuer).setKycStatus([investor.address], true);
    console.log("Approved KYC for investor");


    //------------------------ Purchasing the bond -----------------------------------------//

    console.log("\n--- Investor Purchasing Bond ---");
    const tokensToPurchase = 150; // Purchase 150 tokens
    const totalPrice = bondPrice * BigInt(tokensToPurchase) / BigInt(tokensPerBond);

    // THIS IS THE KEY FIX: Investor (not issuer) approves the bond contract to spend their stablecoins
    await mockStablecoin.connect(investor).approve(bondAddress, totalPrice);
    console.log(`Investor approved ${ethers.formatUnits(totalPrice, 6)} USDC for bond purchase`);

    
    try {
        // This is correct - the investor connects to the bond contract to make the purchase
        await bond.connect(investor).purchaseBondFor(investor.address, tokensToPurchase);
        console.log("The investor successfully purchased 1 bond ✅");
        
        // Check the investor's bond balance
        const bondBalance = await bond.balanceOf(investor.address);
        console.log(`Investor now has ${ethers.formatUnits(bondBalance, 0)} bond tokens`);
        
        // Check the investor's stablecoin balance (should be reduced)
        const stablecoinBalance = await mockStablecoin.balanceOf(investor.address);
        console.log("Investor stablecoin balance after purchasing:", ethers.formatUnits(stablecoinBalance, 6), "USDC");

        // Check the contract's stablecoin balance increased
        const updatedContractBalance = await mockStablecoin.balanceOf(bondAddress);
        console.log(
            `Bond contract balance increased to: ${ethers.formatUnits(updatedContractBalance, 6)} USDC` +
            ` (was ${ethers.formatUnits(contractBalance, 6)} USDC)`
        );
    } catch (error) {
        console.log("❌ Bond purchase failed:", error.message);
        
        // Add debugging information
        console.log("\nDebugging information:");
        console.log("- Investor stablecoin balance:", ethers.formatUnits(await mockStablecoin.balanceOf(investor.address), 6));
        console.log("- Bond contract address:", bondAddress);
        console.log("- Investor address:", investor.address);
        console.log("- Bond price:", ethers.formatUnits(bondPrice, 6));
        console.log("- Approval amount:", ethers.formatUnits(totalPrice, 6));
        process.exit(1);
    }

    console.log("\n---Advancing time by 6 months---");
    await time.increase(185 * 24 * 60 * 60);
    try {
        await bondFactory.connect(investor).claimCoupon(bondAddress, investor.address);
        console.log("Claimed coupon successfully");
        
        const stablecoinBalance = await mockStablecoin.balanceOf(investor.address);
        console.log("Stablecoin balance after coupon:", ethers.formatUnits(stablecoinBalance, 6), "USDC");
    } catch (error) {
        console.log("Coupon claim failed:", error.message);
    }

    console.log("\n---Advancing time by another to matured data---");
    await time.increase(185 * 24 * 60 * 60);
    try {
        await bondFactory.connect(investor).redeemBonds(bondAddress, investor.address);
        console.log("Redeemed bond successfully");
        
        const finalBalance = await mockStablecoin.balanceOf(investor.address);
        console.log("Final stablecoin balance:", ethers.formatUnits(finalBalance, 6), "USDC");
    } catch (error) {
        console.log("Bond redemption failed:", error.message);
    }

    console.log("\nDecommissioning bond...");
    await bondFactory.connect(issuer).decommissionBond(bondAddress);
    console.log("Decommissioned bond");
    const activeBondCount = await bondFactory.getActiveBondCount();
    console.log("Active bonds remaining:", activeBondCount);

}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
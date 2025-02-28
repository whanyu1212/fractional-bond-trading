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
    const [deployer, user1, user2] = await ethers.getSigners();
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
    const mintAmount = ethers.parseUnits("10000", 6); // Mint an ample amount
    const contractMintAmount = ethers.parseUnits("2000", 6);
    // Mint to deployer/user
    await mockStablecoin.mint(deployer.address, mintAmount);
    await mockStablecoin.mint(user1.address, mintAmount); // Mint to user1
    // Mint to contract
    await mockStablecoin.mint(tokenizedBondAddress, contractMintAmount);
    console.log("Deployer/User wallet received:", ethers.formatUnits(mintAmount, 6), "USDC");
    console.log("Bond contract received:", ethers.formatUnits(contractMintAmount, 6), "USDC");

    // 2. Check initial timestamps
    console.log("\n--- Time Check ---");
    const deployTime = await time.latest();
    // console.log("Current blockchain time:", deployTime);
    // console.log("Maturity date:", maturityDate);
    // console.log("Time until maturity:", maturityDate - deployTime, "seconds");
    console.log("Issue date:", new Date(deployTime * 1000).toLocaleDateString());
    console.log("Maturity date:", new Date(maturityDate * 1000).toLocaleDateString());
    console.log("Days until maturity:", Math.floor((maturityDate - deployTime) / (24 * 60 * 60)));


    console.log("\n--- Testing Document Management ---");
    const documentUri = "https://example.com/bond-document";
    const documentContent = "test document content";
    const documentHash = ethers.keccak256(ethers.toUtf8Bytes(documentContent));
    try {
        // Set URI and hash separately
        await tokenizedBond.setDocumentURI(documentUri);
        await tokenizedBond.setDocumentHash(documentHash);
        console.log("Successfully set document URI and hash");
        
        // Get document URI
        const uri = await tokenizedBond.documentURI();
        const hash = await tokenizedBond.documentHash();
        console.log("Retrieved document URI:", uri);
        console.log("Retrieved document hash:", hash);

        // Test document verification
        const isValid = await tokenizedBond.verifyDocument(documentContent);
        console.log("Document verification:", isValid ? "✅ Valid" : "❌ Invalid");
    } catch (error) {
        console.log("❌ Document setting failed:", error.message);
    }

   // Test KYC and whitelist functions
   console.log("\n--- Testing KYC and Whitelist ---");
   try {
       // Add to whitelist first
       await tokenizedBond.addToWhitelist([user1.address]);
       console.log("Successfully added user1 to whitelist");

       await tokenizedBond.addToWhitelist([user2.address]);
       console.log("Successfully added user2 to whitelist");
       
       // Check whitelist status using the public mapping
       const isWhitelisted = await tokenizedBond.whitelist(user2.address);
       console.log("Is user2 whitelisted?", isWhitelisted);

       // Test KYC status
       await tokenizedBond.setKycStatus([user1.address], true);
       console.log("Successfully set KYC status for user1");

       await tokenizedBond.setKycStatus([user2.address], true);
       console.log("Successfully set KYC status for user2");
       
       // Check KYC status using the public mapping
       const hasKYC = await tokenizedBond.kycApproved(user2.address);
       console.log("Does user2 have KYC?", hasKYC);

       // Test removing from whitelist
       await tokenizedBond.removeFromWhitelist([user2.address]);
       console.log("Successfully removed user2 from whitelist");
       
       // Check whitelist status again
       const isStillWhitelisted = await tokenizedBond.whitelist(user2.address);
       console.log("Is user2 still whitelisted?", isStillWhitelisted);
   } catch (error) {
       console.log("❌ KYC/Whitelist operations failed:", error.message);
   }

    // Attempt to purchase bond with non-whitelisted account
    console.log("\n--- Testing Purchase Restrictions ---");
    try {
        await mockStablecoin.connect(user2).approve(tokenizedBondAddress, bondPrice);
        await tokenizedBond.connect(user2).purchaseBondFor(user2.address, 1);
        console.log("❌ Purchase should have failed for non-whitelisted user");
    } catch (error) {
        console.log("✅ Purchase correctly failed for non-whitelisted user");
    }

    // 3. Purchase bond
    console.log("\n--- Bond Purchase ---");

    // User 1 approves the bond contract to spend their stablecoins
    await mockStablecoin.connect(user1).approve(tokenizedBondAddress, bondPrice);
    console.log(`User1 approved ${ethers.formatUnits(bondPrice, 6)} USDC for bond purchase`);

    console.log("\nApproving payment of:", ethers.formatUnits(bondPrice, 6), "USDC to purchase bond");
    
    try {
        await tokenizedBond.connect(user1).purchaseBondFor(user1.address, 1);
        console.log("Successfully purchased 1 bond");
        const bondBalance = await tokenizedBond.balanceOf(user1.address);
        console.log("Paid:", ethers.formatUnits(bondPrice, 6), "USDC");
    } catch (error) {
        console.log("❌ Bond purchase failed:", error.message);
        process.exit(1);
    }

    console.log("\n--- Testing Transfer Restrictions ---");
    try {
        const canTransferResult = await tokenizedBond.canTransfer(user1.address, user2.address);
        if (!canTransferResult) {
            console.log("✅ Transfer correctly blocked:", 
                "User2 is not whitelisted anymore -", 
                await tokenizedBond.whitelist(user2.address)
            );
        } else {
            console.log("❌ Transfer should have been blocked for non-whitelisted user");
        }

        // Test transfer to whitelisted user
        await tokenizedBond.addToWhitelist([user2.address]);
        const canTransferNow = await tokenizedBond.canTransfer(user1.address, user2.address);
        console.log("Can transfer after whitelisting?", canTransferNow ? "✅ Yes" : "❌ No");

    } catch (error) {
        console.log("❌ Transfer restriction test failed:", error.message);
    }

    // 4. Wait 6 months and claim coupon
    console.log("\nAdvancing time by 6 months...");
    await time.increase(180 * 24 * 60 * 60);
    try {
        await tokenizedBond.claimCouponFor(user1.address);
        console.log("Claimed coupon successfully");
        
        const stablecoinBalance = await mockStablecoin.balanceOf(user1.address);
        console.log("Stablecoin balance after coupon:", ethers.formatUnits(stablecoinBalance, 6), "USDC");
    } catch (error) {
        console.log("Coupon claim failed:", error.message);
    }

    // 5. Wait another 6 months and redeem
    console.log("\nAdvancing time by another 6 months...");
    await time.increase(185 * 24 * 60 * 60);
    try {
        await tokenizedBond.redeemFor(user1.address);
        console.log("Redeemed bond successfully");
        
        const finalBalance = await mockStablecoin.balanceOf(user1.address);
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
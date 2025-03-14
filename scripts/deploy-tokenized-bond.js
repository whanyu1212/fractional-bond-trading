const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

async function main() {
    /** Get the current timestamp
        We need to use the Hardhat time helper to ensure that the time is increased
        so that the bond can be tested for coupon payments and redemption
        Do not use Date.now() as it will not match the blockchain time
    */ 
    const currentTimestamp = await time.latest();
    
    // Synthetic values for the bondInfo struct
    const bondName = "Test Bond";
    const bondSymbol = "TBOND";
    const bondId = 1;
    const faceValue = ethers.parseUnits("1000", 6);  // 1000 USDC (6 decimals)
    const couponRate = 500;  // 5.00% (in basis points)
    const couponFrequency = 2;  // Semi-annual payments
    const maturityDate = currentTimestamp + (365 * 24 * 60 * 60);  // 1 year from now
    const tokensPerBond = ethers.parseUnits("1000", 18);  // 1000 tokens per bond
    const bondPrice = ethers.parseUnits("950", 6);  // 950 USDC (slight discount)
    const maxBondSupply = ethers.parseUnits("1000000", 6); // 1,000,000 bonds

    // Get signer for issuer address
    const [deployer, user1, user2, user3, user4] = await ethers.getSigners();
    const issuerAddress = await deployer.getAddress();

    // Deploy MockStablecoin first (The deployer has ownership)
    const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
    const mockStablecoin = await MockStablecoin.deploy("Mock USDC", "USDC");
    await mockStablecoin.waitForDeployment();
    
    const mockStablecoinAddress = await mockStablecoin.getAddress();
    console.log("MockStablecoin deployed to:", mockStablecoinAddress);

    // Then deploy TokenizedBond (The deployer has ownership)
    const TokenizedBond = await ethers.getContractFactory("TokenizedBond");
    const tokenizedBond = await TokenizedBond.deploy(
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
        maxBondSupply          // _maxBondSupply (12th)
    );

    await tokenizedBond.waitForDeployment();
    const tokenizedBondAddress = await tokenizedBond.getAddress();
    console.log("TBOND deployed to:", tokenizedBondAddress);


    // Test functions
    console.log("\n--- Test Minting ---");


    // 1. Mint stablecoins
    const mintAmount = ethers.parseUnits("10000", 6); // Mint an ample amount to deployer and users
    const contractMintAmount = ethers.parseUnits("2000", 6); // Mint a smaller amount to the contract

    // Mint to deployer and some users
    await mockStablecoin.mint(deployer.address, mintAmount);
    await mockStablecoin.mint(user1.address, mintAmount); // Mint to user1
    await mockStablecoin.mint(user2.address, mintAmount); // Mint to user2
    await mockStablecoin.mint(user3.address, mintAmount); // Mint to user3
    await mockStablecoin.mint(user4.address, mintAmount); // Mint to user4

    // Mint to contract
    await mockStablecoin.mint(tokenizedBondAddress, contractMintAmount);
    console.log("Deployer/User wallet received:", ethers.formatUnits(mintAmount, 6), "USDC each");
    console.log("Bond contract received (for payout):", ethers.formatUnits(contractMintAmount, 6), "USDC");


    // 2. Check initial timestamps
    console.log("\n--- Time Check ---");
    const deployTime = await time.latest();
    console.log("Issue date:", new Date(deployTime * 1000).toLocaleDateString());
    console.log("Maturity date:", new Date(maturityDate * 1000).toLocaleDateString());
    console.log("Days until maturity:", Math.floor((maturityDate - deployTime) / (24 * 60 * 60)));

    // 3. Simulate document management
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

   // 4. Test KYC and whitelist functions
   console.log("\n--- Testing KYC and Whitelist ---");
   try {
      // Add all users to whitelist in a loop
      const usersToWhitelist = [user1, user2, user3, user4];
    
      for (let i = 0; i < usersToWhitelist.length; i++) {
          await tokenizedBond.addToWhitelist([usersToWhitelist[i].address]);
          console.log(`Successfully added user${i+1} to whitelist`);
      }
       
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
    // It should fail
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
    // Add after the Transfer Restrictions testing section and before the coupon claiming section

    // 4. Test Bond Swapping/Selling between users
    console.log("\n--- Testing Bond Swapping/Selling ---");
    try {
        // First, ensure both users are fully approved and whitelisted
        await tokenizedBond.setKycStatus([user2.address], true);
        await tokenizedBond.addToWhitelist([user1.address, user2.address]);
        console.log("Both users are KYC approved and whitelisted: ✅");
        
        // Get initial balances
        const user1InitialBondBalance = await tokenizedBond.balanceOf(user1.address);
        const user2InitialBondBalance = await tokenizedBond.balanceOf(user2.address);
        const user1InitialStableBalance = await mockStablecoin.balanceOf(user1.address);
        const user2InitialStableBalance = await mockStablecoin.balanceOf(user2.address);
        
        console.log(`\nInitial balances:`);
        console.log(`User1 bond balance: ${ethers.formatUnits(user1InitialBondBalance, 18)} tokens`);
        console.log(`User2 bond balance: ${ethers.formatUnits(user2InitialBondBalance, 18)} tokens`);
        console.log(`User1 stablecoin balance: ${ethers.formatUnits(user1InitialStableBalance, 6)} USDC`);
        console.log(`User2 stablecoin balance: ${ethers.formatUnits(user2InitialStableBalance, 6)} USDC`);
        
        // Set up the swap parameters
        const tokenAmountToSwap = ethers.parseUnits("500", 18); // User1 sends 500 bond tokens
        const paymentAmount = ethers.parseUnits("500", 6);      // User2 pays 500 USDC
        
        // User2 approves stablecoin payment
        await mockStablecoin.connect(user2).approve(tokenizedBondAddress, paymentAmount);
        console.log(`User2 approved ${ethers.formatUnits(paymentAmount, 6)} USDC for payment`);
        
        // Demonstrate that either party can initiate the swap
        console.log("\nScenario 1: User1 selling bond to User2");
        await tokenizedBond.connect(user1).swapBonds(
            user1.address,  // from - User1 sends tokens
            user2.address,  // to - User2 receives tokens
            tokenAmountToSwap,
            paymentAmount
        );
        console.log("✅ User1 sold 500 tokens to User2 for 500 USDC");
        
        // Get intermediate balances
        const user1MidBondBalance = await tokenizedBond.balanceOf(user1.address);
        const user2MidBondBalance = await tokenizedBond.balanceOf(user2.address);
        console.log(`User1 tokens now: ${ethers.formatUnits(user1MidBondBalance, 18)}`);
        console.log(`User2 tokens now: ${ethers.formatUnits(user2MidBondBalance, 18)}`);
        
        // Now let's set up for the reverse swap - User2 initiates
        // User1 approves stablecoin for the reverse direction
        await mockStablecoin.connect(user1).approve(tokenizedBondAddress, paymentAmount);
        
        console.log("\nScenario 2: User2 initiates the swap back");
        await tokenizedBond.connect(user2).swapBonds(
            user2.address,  // now User2 is sending tokens back
            user1.address,  // now User1 is receiving tokens back
            tokenAmountToSwap,
            paymentAmount
        );
        console.log("✅ User2 sold 500 tokens to User1 for 500 USDC");
        
        // Get final balances
        const user1FinalBondBalance = await tokenizedBond.balanceOf(user1.address);
        const user2FinalBondBalance = await tokenizedBond.balanceOf(user2.address);
        const user1FinalStableBalance = await mockStablecoin.balanceOf(user1.address);
        const user2FinalStableBalance = await mockStablecoin.balanceOf(user2.address);
        
        console.log(`\nFinal balances after both swaps:`);
        console.log(`User1 bond balance: ${ethers.formatUnits(user1FinalBondBalance, 18)} tokens`);
        console.log(`User2 bond balance: ${ethers.formatUnits(user2FinalBondBalance, 18)} tokens`);
        console.log(`User1 stablecoin balance: ${ethers.formatUnits(user1FinalStableBalance, 6)} USDC`);
        console.log(`User2 stablecoin balance: ${ethers.formatUnits(user2FinalStableBalance, 6)} USDC`);
        
        // Test restrictions again
        console.log(`\nTesting swap restrictions:`);
        await tokenizedBond.removeFromWhitelist([user3.address]);
        
        try {
            await tokenizedBond.connect(user1).swapBonds(user1.address, user3.address, tokenAmountToSwap, paymentAmount);
            console.log("❌ Swap should have failed for non-whitelisted user");
        } catch (error) {
            console.log("✅ Swap correctly failed for non-whitelisted user");
        }
        
    } catch (error) {
        console.log("❌ Bond swap test failed:", error.message);
        console.error(error);
    }

    // 5. Wait 6 months and claim coupon
    console.log("\nAdvancing time by 6 months...");
    await time.increase(185 * 24 * 60 * 60);
    try {
        await tokenizedBond.claimCouponFor(user1.address);
        console.log("Claimed coupon successfully");
        
        const stablecoinBalance = await mockStablecoin.balanceOf(user1.address);
        console.log("Stablecoin balance after coupon:", ethers.formatUnits(stablecoinBalance, 6), "USDC");
    } catch (error) {
        console.log("Coupon claim failed:", error.message);
    }

    // 6. Wait another 6 months and redeem
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
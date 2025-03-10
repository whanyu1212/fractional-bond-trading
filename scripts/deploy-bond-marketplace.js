const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

async function main() {
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

    // Number of bonds to mint and list on the marketplace by the issuer
    const bondAmount = 10; 

    // Get signer for issuer address
    const [deployer] = await ethers.getSigners();
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

    // public structs in TokenizedBond contract
    const bondInfo = await tokenizedBond.bondInfo();
    const fractionInfo = await tokenizedBond.fractionInfo();


    // Deploy BondMarketplace (The deployer has ownership)
    const BondMarketplace = await ethers.getContractFactory("BondMarketPlace");
    const bondMarketplace = await BondMarketplace.deploy();
    await bondMarketplace.waitForDeployment();
    const bondMarketplaceAddress = await bondMarketplace.getAddress();
    console.log("BondMarketplace deployed to:", bondMarketplaceAddress);

    console.log("\n--- Testing Bond Functions ---");

    // Calculate required reserves for future payments

    // Number of coupons to pay until maturity
    const remainingCoupons = Math.floor(((maturityDate - currentTimestamp) * couponFrequency) / (365 * 24 * 60 * 60));
    // Calculate the total required amount for payout for each bond
    const couponPaymentPerBond = (faceValue * BigInt(couponRate) * BigInt(remainingCoupons)) / (BigInt(10000) * BigInt(couponFrequency));
    const principalPerBond = faceValue;
    // Total required amount (principal + coupon payments) for the bond
    const totalRequiredPerBond = couponPaymentPerBond + principalPerBond;
    // We minted 10 bonds, so multiply by the bond amount
    const totalRequired = totalRequiredPerBond * BigInt(bondAmount);

    // Add 10% buffer for safety
    const reserveAmount = (totalRequired * BigInt(110)) / BigInt(100);

    // Mint stablecoins with sufficient reserves
    const userMintAmount = ethers.parseUnits("10000", 6); // For user operations
    
    // Mint to deployer/user
    await mockStablecoin.mint(deployer.address, userMintAmount);
    // Mint sufficient reserves to contract
    await mockStablecoin.mint(tokenizedBondAddress, reserveAmount);
    
    console.log("Deployer/User wallet received:", ethers.formatUnits(userMintAmount, 6), "USDC");
    console.log("Bond contract received:", ethers.formatUnits(reserveAmount, 6), "USDC");

    // Check initial timestamps
    console.log("\n--- Time Check ---");
    const deployTime = await time.latest();
    console.log("Issue date:", new Date(deployTime * 1000).toLocaleDateString());
    // console.log("Maturity date:", new Date(bondInfo.maturityDate * 1000).toLocaleDateString());
    // Fix for TypeError: Cannot mix BigInt and other types
    console.log("Maturity date:", new Date(Number(bondInfo.maturityDate) * 1000).toLocaleDateString());
    console.log("Days until maturity:", Math.floor((maturityDate - deployTime) / (24 * 60 * 60)));

    // Mint bonds to marketplace
    console.log("\n--- Minting Bonds to Marketplace ---");
    await tokenizedBond.mintBond(bondMarketplaceAddress, bondAmount);
    console.log(`Minted ${bondAmount} bonds to marketplace at ${bondMarketplaceAddress}`);

    console.log("\n--- Listing Bonds on Marketplace ---");
    
    // Approve marketplace to handle bonds
    await tokenizedBond.approve(bondMarketplaceAddress, BigInt(bondAmount) * tokensPerBond);
    
    await bondMarketplace.listBond(
        bondInfo.bondId,            // bondId 
        tokenizedBondAddress,       // bondAddress - not the issuer/deployer address
        fractionInfo.bondPrice      // price 
    );
    console.log(`Listed bond ID ${bondInfo.bondId} at ${ethers.formatUnits(fractionInfo.bondPrice, 6)} USDC each`);

    // Verify listing using bondId
    const [issuer, price, listingTime, isMatured, totalHolders] = await bondMarketplace.getBondInfo(bondInfo.bondId);
    console.log("\n--- Listing Details ---");
    console.log("Bond ID:", bondId);
    console.log("Issuer:", issuer);
    console.log("Price:", ethers.formatUnits(price, 6), "USDC");
    console.log("Listing Time:", new Date(Number(listingTime) * 1000).toLocaleString());
    console.log("Is Matured:", isMatured);
    console.log("Total Holders:", totalHolders.toString());


    // Test bond purchase
    console.log("\n--- Testing Bond Purchase ---");
    
    // Get a buyer account
    const [_, buyer] = await ethers.getSigners();
    console.log("Buyer address:", await buyer.getAddress());

    const listingPrice = price;
    
    // Mint USDC to buyer
    const purchaseAmount = 2; // Number of bonds to purchase
    const totalPrice = listingPrice * BigInt(purchaseAmount);
    await mockStablecoin.mint(buyer.getAddress(), totalPrice);
    console.log("Buyer received:", ethers.formatUnits(totalPrice, 6), "USDC");
    
    // Approve USDC spending for the bond contract
    // Since the tokenizedbond requires whitelisting and kyc approval
    // we need to add the buyer to the whitelist and approve KYC
    // (This is a simplified version of a real KYC process)
    await tokenizedBond.connect(deployer).addToWhitelist([buyer.getAddress()]);
    await tokenizedBond.connect(deployer).setKycStatus([buyer.getAddress()], true);
    console.log("✅ Buyer added to whitelist and KYC approved by deployer");
    await mockStablecoin.connect(buyer).approve(tokenizedBondAddress, totalPrice);
    console.log("✅ Approved USDC spending for tokenized bond contract");

    // Now also approve the bond contract to transfer tokens on behalf of the marketplace 
    // (The marketplace needs to be approved to spend bond tokens)
    await tokenizedBond.connect(deployer).approve(bondMarketplaceAddress, BigInt(bondAmount) * tokensPerBond);
    console.log("✅ Approved bond token spending for marketplace contract");

    const allowance = await mockStablecoin.allowance(buyer.getAddress(), tokenizedBondAddress);
    console.log("USDC Allowance set by buyer:", allowance.toString());
        
    // Purchase bonds through marketplace
    await bondMarketplace.connect(buyer).purchaseBond(bondInfo.bondId, purchaseAmount);
    console.log(`Purchased ${purchaseAmount} bonds at ${ethers.formatUnits(listingPrice, 6)} USDC each`);

    // Test coupon claim and bond redemption
    console.log("\n--- Testing Coupon Payout ---");
    // Fast-forward time by one coupon period (e.g. semi-annual: 365 days / couponFrequency)
    const secondsToIncrease = Math.floor(185 * 24 * 60 * 60 / couponFrequency) + 1;
    await time.increase(secondsToIncrease);
    console.log(`Time increased by ${secondsToIncrease} seconds`);

    // Claim the coupon through the marketplace instead of directly
    await bondMarketplace.connect(buyer).claimCoupon(bondInfo.bondId);
    console.log(`✅ Buyer claimed coupon for bond ID ${bondInfo.bondId} through marketplace`);

    // Check buyer's stablecoin balance after coupon claim
    const buyerBalanceAfterClaim = await mockStablecoin.balanceOf(buyer.getAddress());
    console.log("Buyer's stablecoin balance after coupon claim:", ethers.formatUnits(buyerBalanceAfterClaim, 6));

    console.log("\n--- Testing Redemption ---");
    // Fast-forward time until maturity
    const currentTimeAfterCoupon = await time.latest();
    const secondsUntilMaturity = Number(maturityDate) - currentTimeAfterCoupon + 10;
    console.log(`Time increased by ${secondsUntilMaturity} seconds to reach maturity`);
    await time.increase(secondsUntilMaturity);

    // Update the bond to matured status in the marketplace
    // Either create a function in the marketplace contract to update maturity:
    await bondMarketplace.updateBondMaturity(bondInfo.bondId, true);
    console.log("Updated bond maturity status to true");

    // Now redemption should work
    await bondMarketplace.connect(buyer).redeemBond(bondInfo.bondId);
    console.log(`✅ Buyer redeemed bond ID ${bondInfo.bondId}`);

    // check buyer's stablecoin balance after redemption
    const buyerBalanceAfterRedemption = await mockStablecoin.balanceOf(await buyer.getAddress());
    console.log("Buyer's stablecoin balance after redemption:", ethers.formatUnits(buyerBalanceAfterRedemption, 6));

    // Test market analytics functionality
    console.log("\n--- Testing Market Analytics ---");
    const bondMetrics = await bondMarketplace.getBondMarketMetrics(bondInfo.bondId);
    console.log("Bond Market Metrics:");
    console.log("Last Price:", ethers.formatUnits(bondMetrics.lastPrice, 6), "USDC");
    console.log("24h Volume:", ethers.formatUnits(bondMetrics.volume24h, 6), "USDC");
    console.log("Number of Holders:", bondMetrics.numberOfHolders.toString());
    console.log("Average Holding Time:", bondMetrics.averageHoldingTime.toString(), "seconds");
    console.log("Total Value Locked:", ethers.formatUnits(bondMetrics.totalValueLocked, 6), "USDC");

    // Get buyer metrics
    const buyerMetrics = await bondMarketplace.getUserMetrics(buyer.getAddress());
    console.log("\nBuyer Metrics:");
    console.log("Bonds Held:", buyerMetrics.bondsHeld.toString());
    console.log("Total Trading Volume:", ethers.formatUnits(buyerMetrics.totalVolume, 6), "USDC");
    console.log("Active Positions:", buyerMetrics.activePositions.map(pos => pos.toString()).join(", "));

    // Get all bond holders
    const bondHolders = await bondMarketplace.getAllBondHolders(bondInfo.bondId);
    console.log("\nAll Bond Holders:");
    for (const holder of bondHolders) {
    console.log(holder);
    }

    // Check global marketplace statistics
    const totalListedBonds = await bondMarketplace.totalListedBonds();
    const totalTradingVolume = await bondMarketplace.totalTradingVolume();
    console.log("\nGlobal Marketplace Statistics:");
    console.log("Total Listed Bonds:", totalListedBonds.toString());
    console.log("Total Trading Volume:", ethers.formatUnits(totalTradingVolume, 6), "USDC");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
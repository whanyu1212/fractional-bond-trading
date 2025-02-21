const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

async function main() {
    // Get the current timestamp
    const currentTimestamp = await time.latest();
    
    // Synthetic values
    const faceValue = ethers.parseUnits("1000", 6);  // 1000 USDC (6 decimals)
    const couponRate = 500;  // 5.00% (in basis points)
    const couponFrequency = 2;  // Semi-annual payments
    const maturityDate = currentTimestamp + (365 * 24 * 60 * 60);  // 1 year from now
    const tokensPerBond = ethers.parseUnits("1000", 18);  // 1000 tokens per bond
    const bondPrice = ethers.parseUnits("950", 6);  // 950 USDC (slight discount)
    const maxBondSupply = ethers.parseUnits("1000000", 6); // 1,000,000 bonds
    const bondAmount = 10; // Number of bonds to mint

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

    // Deploy BondMarketplace
    const BondMarketplace = await ethers.getContractFactory("BondMarketPlace");
    const bondMarketplace = await BondMarketplace.deploy();
    await bondMarketplace.waitForDeployment();
    const bondMarketplaceAddress = await bondMarketplace.getAddress();
    console.log("BondMarketplace deployed to:", bondMarketplaceAddress);

    console.log("\n--- Testing Bond Functions ---");

    // Calculate required reserves for future payments
    const remainingCoupons = Math.floor(((maturityDate - currentTimestamp) * couponFrequency) / (365 * 24 * 60 * 60));
    const couponPaymentPerBond = (faceValue * BigInt(couponRate) * BigInt(remainingCoupons)) / (BigInt(10000) * BigInt(couponFrequency));
    const principalPerBond = faceValue;
    const totalRequiredPerBond = couponPaymentPerBond + principalPerBond;
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
    console.log("Maturity date:", new Date(maturityDate * 1000).toLocaleDateString());
    console.log("Days until maturity:", Math.floor((maturityDate - deployTime) / (24 * 60 * 60)));

    // Mint bonds to marketplace
    console.log("\n--- Minting Bonds to Marketplace ---");
    await tokenizedBond.mintBond(bondMarketplaceAddress, bondAmount);
    console.log(`Minted ${bondAmount} bonds to marketplace at ${bondMarketplaceAddress}`);

    console.log("\n--- Listing Bonds on Marketplace ---");
    const listingPrice = ethers.parseUnits("975", 6); // 975 USDC per bond
    const bondId = 1; // First bond listing
    
    // Approve marketplace to handle bonds
    await tokenizedBond.approve(bondMarketplaceAddress, BigInt(bondAmount) * tokensPerBond);
    
    // List the bonds with correct parameter order
    await bondMarketplace.listBond(
        bondId,                  // unique identifier for the bond listing
        tokenizedBondAddress,    // bond token contract address
        listingPrice            // price per bond
    );
    console.log(`Listed bond ID ${bondId} at ${ethers.formatUnits(listingPrice, 6)} USDC each`);

    // Verify listing using bondId
    const [issuer, price, listingTime, isMatured, totalHolders] = await bondMarketplace.getBondInfo(bondId);
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
    
    // Mint USDC to buyer
    const purchaseAmount = 2; // Number of bonds to purchase
    const totalPrice = listingPrice * BigInt(purchaseAmount);
    await mockStablecoin.mint(buyer.getAddress(), totalPrice);
    console.log("Buyer received:", ethers.formatUnits(totalPrice, 6), "USDC");
    
    // Approve USDC spending for marketplace contract (not the bond contract)
    await mockStablecoin.connect(buyer).approve(tokenizedBondAddress, totalPrice);
    console.log("Approved USDC spending for tokenized bond contract");

    const allowance = await mockStablecoin.allowance(buyer.getAddress(), tokenizedBondAddress);
    console.log("Allowance set by buyer:", allowance.toString());
    
    // Purchase bonds through marketplace
    await bondMarketplace.connect(buyer).purchaseBond(bondId, purchaseAmount);
    console.log(`Purchased ${purchaseAmount} bonds at ${ethers.formatUnits(listingPrice, 6)} USDC each`);
    console.log("Buyer's bond balance:", await tokenizedBond.balanceOf(await buyer.getAddress()));
    console.log("Buyer's stablecoin balance:", ethers.formatUnits(await mockStablecoin.balanceOf(await buyer.getAddress()), 6));

    // Test coupon claim and bond redemption
    console.log("\n--- Testing Coupon Payout ---");
    // Fast-forward time by one coupon period (e.g. semi-annual: 365 days / couponFrequency)
    const secondsToIncrease = Math.floor(365 * 24 * 60 * 60 / couponFrequency) + 1;
    await time.increase(secondsToIncrease);
    console.log(`Time increased by ${secondsToIncrease} seconds`);

    // Have the buyer claim the coupon directly on the tokenized bond contract (or via marketplace if implemented)
    await tokenizedBond.connect(buyer).claimCoupon();
    console.log("Buyer claimed coupon");

    // Check buyer's stablecoin balance after coupon claim
    const buyerBalanceAfterClaim = await mockStablecoin.balanceOf(await buyer.getAddress());
    console.log("Buyer's stablecoin balance after coupon claim:", ethers.formatUnits(buyerBalanceAfterClaim, 6));

    console.log("\n--- Testing Redemption ---");
    // Fast-forward time until maturity (add an extra second for safety)
    const currentTimeAfterCoupon = await time.latest();
    const secondsToMaturity = maturityDate - currentTimeAfterCoupon + 1;
    await time.increase(secondsToMaturity);
    console.log(`Time increased by ${secondsToMaturity} seconds to reach maturity`);

    // Have the buyer redeem the bond via the marketplace
    await bondMarketplace.connect(buyer).redeemBond(bondId);
    console.log("Buyer redeemed bond via marketplace");

    // check buyer's stablecoin balance after redemption
    const buyerBalanceAfterRedemption = await mockStablecoin.balanceOf(await buyer.getAddress());
    console.log("Buyer's stablecoin balance after redemption:", ethers.formatUnits(buyerBalanceAfterRedemption, 6));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
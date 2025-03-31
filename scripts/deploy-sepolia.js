async function main() {
    const [deployer, player1, player2 ] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    console.log("Player1 address:", player1.address);
    console.log("Player2 address:", player2.address);

    //Deploy Mockstablecoin
    const tokenName = "BondChain Coin";
    const tokenSymbol = "BCC";
    const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
    const mockStablecoin = await MockStablecoin.deploy(tokenName,tokenSymbol);
    await mockStablecoin.waitForDeployment();
    const mockStablecoinAddress = await mockStablecoin.getAddress();
    console.log("mockStablecoin deployed to:", mockStablecoinAddress);

    //Deploy TokenizedBond
    // const TokenizedBond = await ethers.getContractFactory("TokenizedBond");
    // const tokenizedBond = await TokenizedBond.deploy();
    // await tokenizedBond.waitForDeployment();
    // console.log("TokenizedBond deployed to:", await tokenizedBond.getAddress());
    
    // Deploy BondFactory
    const BondFactory = await ethers.getContractFactory("BondFactory");
    const bondFactory = await BondFactory.deploy();
    await bondFactory.waitForDeployment();
    console.log("BondFactory deployed to:", await bondFactory.getAddress());

    // Deploy the BondMarketplace
    const BondMarketplace = await ethers.getContractFactory("BondMarketPlace");
    const bondMarketplace = await BondMarketplace.deploy();
    await bondMarketplace.waitForDeployment();
    console.log("BondMarketplace deployed to:", await bondMarketplace.getAddress());


    const bondName = "Test Bond";
    const bondSymbol = "TBOND";
    const bondId = 1;
    const faceValue = ethers.parseUnits("1000", 6);  // 1000 USDC (6 decimals)
    const couponRate = 500;  // 5.00% (in basis points)
    const couponFrequency = 2;  // Semi-annual payments
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const maturityDate = currentTimestamp + (365 * 24 * 60 * 60);  // 1 year from now
    const tokensPerBond = 1000;
    const bondPrice = ethers.parseUnits("950", 6);  // 950 USDC (slight discount)
    const maxBondSupply = ethers.parseUnits("1000000", 6); // 1,000,000 bonds

    // Create bond with issuer as a different address
    const createTx = await bondFactory.createTokenizedBond(
        bondName,
        bondSymbol,
        bondId,
        faceValue,
        couponRate,
        couponFrequency,
        maturityDate,
        player1.address,  // Use the issuer account, not the deployer
        mockStablecoinAddress, // removed hardcoding of mockStablecoin address
        tokensPerBond,
        bondPrice,
        maxBondSupply
    );

    // Wait for transaction to be mined
    const receipt = await createTx.wait();
    console.log("✅ Bond 1 created successfully in block:", receipt.blockNumber);

    // Get the bond address from the mapping
    const bondAddress = await bondFactory.bondIdToAddress(bondId);
    console.log("Bond created at address:", bondAddress);


    // Convert BigInt values to strings for JSON serialization
    const network = await ethers.provider.getNetwork();
    
    // Save deployment info - convert any BigInt to string
    const fs = require("fs");
    const deploymentInfo = {
        networkId: network.chainId.toString(),
        factoryAddress: await bondFactory.getAddress(),
        bondAddress: bondAddress,
        bondId: bondId.toString(),
        deployer: deployer.address,
        issuer: player1,
        deploymentTime: new Date().toISOString()
    };
    
    fs.writeFileSync(
        "deployment-info.json", 
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("Deployment info saved to deployment-info.json");

    // Get total bond count
    const bondCount = await bondFactory.getTotalBondCount();
    console.log("Total bonds count:", bondCount.toString());
    
    // Get active bond details
    const bondDetails = await bondFactory.getActiveBondDetailsByBondId(bondId);
    console.log("Active bond details:", {
        bondAddress: bondAddress,
        bondId: bondDetails.returnBondId.toString(),
        issuer: bondDetails.issuer,
        faceValue: ethers.formatUnits(bondDetails.faceValue, 6),
        couponRate: bondDetails.couponRate.toString(),
        couponFrequency: bondDetails.couponFrequency.toString(),
        maturityDate: new Date(Number(bondDetails.maturityDate.toString()) * 1000).toISOString(),
        tokensPerBond: bondDetails.tokensPerBond.toString(),
        tokenPrice: ethers.formatUnits(bondDetails.tokenPrice, 6),
        maxBondSupply: ethers.formatUnits(bondDetails.maxBondSupply, 6),
    });
    
    const modifyTx = await bondFactory.connect(player1).modifyBond(
        bondAddress,
        600,
        currentTimestamp + (365 * 24 * 60 * 60),
        0,  // Keep maxBondSupply as is
        0   // Keep tokenPrice as is
    );
    await modifyTx.wait();
    console.log("Bond modified successfully");
    const modifiedBondDetails = await bondFactory.getActiveBondDetailsByBondId(bondId);
    console.log("Modified bond details:", {
        bondAddress: bondAddress,
        bondId: modifiedBondDetails.returnBondId.toString(),
        issuer: modifiedBondDetails.issuer,
        faceValue: ethers.formatUnits(modifiedBondDetails.faceValue, 6),
        couponRate: modifiedBondDetails.couponRate.toString(),
        couponFrequency: modifiedBondDetails.couponFrequency.toString(),
        maturityDate: new Date(Number(modifiedBondDetails.maturityDate.toString()) * 1000).toISOString(),
        tokensPerBond: modifiedBondDetails.tokensPerBond.toString(),
        tokenPrice: ethers.formatUnits(modifiedBondDetails.tokenPrice, 6),
        maxBondSupply: ethers.formatUnits(modifiedBondDetails.maxBondSupply, 6),
    });

    // BondMarketplace functions
    // Calculate required reserves for future payments
    
    // Number of coupons to pay until maturity
    bondAmount = 10; // Number of bonds to be minted
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
    await mockStablecoin.mint(bondAddress, reserveAmount);
    
    console.log("Deployer/User wallet received:", ethers.formatUnits(userMintAmount, 6), "USDC");
    console.log("Bond contract received:", ethers.formatUnits(reserveAmount, 6), "USDC");


    await bondMarketplace.listBond(
        bondId,
        bondAddress,
        bondPrice,
    );

    const bondDetail = await bondFactory.getActiveBondDetailsByBondId(bondId);
    console.log("Bond details for listing:", {
        bondAddress: bondDetail.bondAddress,
        bondId: bondDetail.returnBondId.toString(),
        issuer: bondDetail.issuer,
        faceValue: ethers.formatUnits(bondDetail.faceValue, 6),
        couponRate: bondDetail.couponRate.toString(),
        couponFrequency: bondDetail.couponFrequency.toString(),
        maturityDate: new Date(Number(bondDetail.maturityDate.toString()) * 1000).toISOString(),
        tokensPerBond: bondDetail.tokensPerBond.toString(),
        tokenPrice: ethers.formatUnits(bondDetail.tokenPrice, 6),
        maxBondSupply: ethers.formatUnits(bondDetail.maxBondSupply, 6),
    });

    
    // Verify listing using bondId
    const [issuer, price, listingTime, isMatured, totalHolders] = await bondMarketplace.getBondInfo(bondId);
    console.log("\n--- Listing Details ---");
    console.log("Bond ID:", bondId);
    console.log("Issuer:", issuer);
    console.log("Price:", ethers.formatUnits(price, 6), "USDC");
    console.log("Listing Time:", new Date(Number(listingTime) * 1000).toLocaleString());
    console.log("Is Matured:", isMatured);
    console.log("Total Holders:", totalHolders.toString());


}

main().catch((error) => {
    console.error("Deployment failed:", error);
    process.exitCode = 1;
});
async function main() {
    // signers
    const [deployer, player1, player2, player3 ] = await ethers.getSigners();
    console.log("\nDeployer address:", deployer.address);
    console.log("\nPlayer1 address:", player1.address);
    console.log("\nPlayer2 address:", player2.address);
    console.log("\nPlayer3 address:", player3.address);


    //Deploy Mockstablecoin
    const tokenName = "BondChain Coin";
    const tokenSymbol = "BCC";
    const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
    const mockStablecoin = await MockStablecoin.deploy(tokenName,tokenSymbol);
    await mockStablecoin.waitForDeployment();
    const mockStablecoinAddress = await mockStablecoin.getAddress();
    console.log("\nmockStablecoin deployed to:", mockStablecoinAddress);


    
    // Deploy BondFactory
    const BondFactory = await ethers.getContractFactory("BondFactory");
    const bondFactory = await BondFactory.deploy();
    await bondFactory.waitForDeployment();
    console.log("\nBondFactory deployed to:", await bondFactory.getAddress());

    // Deploy the BondMarketplace
    const BondMarketplace = await ethers.getContractFactory("BondMarketPlace");
    const bondMarketplace = await BondMarketplace.deploy();
    await bondMarketplace.waitForDeployment();
    console.log("\nBondMarketplace deployed to:", await bondMarketplace.getAddress());



    // Values for bond creation
    const bondName = "Test Bond";
    const bondSymbol = "TBOND";
    const bondId = 1;
    const faceValue = ethers.parseUnits("1000", 6);  // 1000 USDC (6 decimals)
    const couponRate = 500;  // 5.00% (in basis points)
    const couponFrequency = 2;  // Semi-annual payments
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const maturityDate = currentTimestamp + (365 * 24 * 60 * 60);  // 1 year from now
    const tokensPerBond = 1000;
    const tokenPrice = ethers.parseUnits("950", 6);  // 950 USDC (slight discount)
    const maxBondSupply = ethers.parseUnits("100000", 6);  // 10,000 USDC (total supply of the bond)

    // Create bond with issuer, assuming player1 is the issuer in this case
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
        tokenPrice,
        maxBondSupply
    );

    // Wait for transaction to be mined
    const receipt = await createTx.wait();
    console.log("\n✅ Bond 1 created successfully in block:", receipt.blockNumber);

    // Get the bond address from the mapping
    const bondAddress = await bondFactory.bondIdToAddress(bondId);
    console.log("\n✅ Bond created at address:", bondAddress);


    // Writing deployment info to JSON file

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
    console.log("\n Deployment info saved to deployment-info.json");

    // Get total bond count
    const bondCount = await bondFactory.getTotalBondCount();
    console.log("\nTotal created bonds count:", bondCount.toString());
    
    bondAmount = 1
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

    await mockStablecoin.mint(player1.address, reserveAmount);
    
    await mockStablecoin.connect(player1).approve(bondAddress, reserveAmount);
    console.log(`Player1 approved bond contract to spend ${ethers.formatUnits(reserveAmount, 6)} USDC`);

    // Player1 transfers the stablecoins to the bond contract
    await mockStablecoin.connect(player1).transfer(bondAddress, reserveAmount);
    console.log(`Player1 transferred ${ethers.formatUnits(reserveAmount, 6)} USDC to bond contract`);

    // Check the bond contract's balance to verify
    const bondBalance = await mockStablecoin.balanceOf(bondAddress);
    console.log(`Bond contract stablecoin balance: ${ethers.formatUnits(bondBalance, 6)} USDC`);

    await bondFactory.connect(player1).mintBond(
        bondAddress,
        player1.address, // Mint to issuer first
        bondAmount, // Total bond offering (e.g., 10 bonds)
    );
    console.log(`Minted ${bondAmount} TBONDs to issuer at ${player1.address}`);
    
    const modifyTx = await bondFactory.connect(player1).modifyBond(
        bondAddress,
        600,
        currentTimestamp + (365 * 24 * 60 * 60),
        0,  // Keep maxBondSupply as is
        0   // Keep tokenPrice as is
    );
    await modifyTx.wait();
    console.log("\n✅ Bond modified successfully");


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

    await bondMarketplace.connect(player1).listBond(
        bondId,
        bondAddress,
        tokenPrice,
    );
    console.log(`Player1 listed bond #${bondId} on marketplace at ${ethers.formatUnits(tokenPrice, 6)} USDC per token`);

    const tokensToBuy = 100; // Want to buy 100 tokens

    // Calculate total cost
    const totalCost = BigInt(tokensToBuy) * tokenPrice;

    console.log(`Player 2 Buying ${tokensToBuy} tokens at ${ethers.formatUnits(tokenPrice, 6)} USDC each`);

    // Get the TokenizedBond contract instance
    const tokenizedBond = await ethers.getContractAt("TokenizedBond", bondAddress);

    // Player1 approves marketplace to transfer bond tokens
    await tokenizedBond.connect(player1).approve(
        await bondMarketplace.getAddress(),
        tokensToBuy
    );
    console.log(`Player1 approved marketplace to transfer ${tokensToBuy} bond tokens`);

    // Mint USDC to player2
    await mockStablecoin.mint(player2.address, totalCost);

    // Player2 approves BOTH marketplace AND bond contract
    // Approve marketplace
    await mockStablecoin.connect(player2).approve(
        await bondMarketplace.getAddress(),
        totalCost
    );
    console.log(`Player2 approved marketplace to spend ${ethers.formatUnits(totalCost, 6)} USDC`);

    // Approve bond contract directly
    await mockStablecoin.connect(player2).approve(
        bondAddress,
        totalCost
    );
    console.log(`Player2 approved bond contract to spend ${ethers.formatUnits(totalCost, 6)} USDC`);

    // Purchase tokens
    await bondMarketplace.connect(player2).purchaseBond(
        bondId,
        tokensToBuy
    );
    console.log(`Player2 purchased ${tokensToBuy} bond tokens for ${ethers.formatUnits(totalCost, 6)} USDC`);
    console.log(`Player2 bond balance: ${await tokenizedBond.balanceOf(player2.address)} TBOND tokens`);
    console.log(`Player2 USDC balance: ${ethers.formatUnits(await mockStablecoin.balanceOf(player2.address), 6)} USDC`);
    console.log(`Marketplace bond balance: ${ethers.formatUnits(await tokenizedBond.balanceOf(bondMarketplace.getAddress()), 6)} TBOND`);

    // player 2 transfer to player 3
    // await tokenizedBond.connect(player2).transfer(player3.address, 10);

    const tokenAmountToExchange = 10
    
    // 1. Log balances and permissions before the exchange
    const player2Balance = await tokenizedBond.balanceOf(player2.address);
    console.log(`Player2 current balance: ${player2Balance} tokens`);

    // 2. Check if player2 is the bond owner
    const player2OwnsBonds = player2Balance >= tokenAmountToExchange;
    console.log(`Player2 has enough tokens: ${player2OwnsBonds}`);




    // 5. Ensure player2 approval for marketplace
    await tokenizedBond.connect(player2).approve(
        await bondMarketplace.getAddress(),
        tokenAmountToExchange 
    );
    console.log(`Player2 approved marketplace to transfer ${tokenAmountToExchange} bond tokens`);

    await bondMarketplace.connect(player2).exchangeBonds(
        bondId,
        player2.address, // from
        player3.address, // to
        tokenAmountToExchange,
        0  // 0 for gifting
    );

    console.log(`Exchanged ${tokenAmountToExchange} bond tokens from Player2 to Player3`);
    console.log(`Player2 bond balance: ${await tokenizedBond.balanceOf(player2.address)} TBOND tokens`);
    console.log(`Player3 bond balance: ${await tokenizedBond.balanceOf(player3.address)} TBOND tokens`);
}

main().catch((error) => {
    console.error("Deployment failed:", error);
    process.exitCode = 1;
});
const fs = require("fs");
const { ethers } = require("hardhat");

async function main() {
    // === Signers ===
    const [deployer, player1, player2] = await ethers.getSigners(); // Removed player3 for now
    console.log("\nDeployer address:", deployer.address);
    console.log("Player1 (Issuer) address:", player1.address);
    console.log("Player2 (Buyer) address:", player2.address);
    // console.log("Player3 (Recipient) address:", player3.address); // Removed player3
    console.log("----------------------------------------------------");

    // === Deploy MockStablecoin ===
    const tokenName = "BondChain Coin";
    const tokenSymbol = "BCC";
    const stablecoinDecimals = 6; // Assuming 6 decimals like USDC
    const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
    const mockStablecoin = await MockStablecoin.deploy(tokenName, tokenSymbol);
    await mockStablecoin.waitForDeployment();
    const mockStablecoinAddress = await mockStablecoin.getAddress();
    console.log(`MockStablecoin (${tokenSymbol}) deployed to: ${mockStablecoinAddress}`);
    console.log("----------------------------------------------------");

    // === Deploy BondFactory ===
    const BondFactory = await ethers.getContractFactory("BondFactory");
    const bondFactory = await BondFactory.deploy();
    await bondFactory.waitForDeployment();
    const bondFactoryAddress = await bondFactory.getAddress();
    console.log(`BondFactory deployed to: ${bondFactoryAddress}`);
    console.log("----------------------------------------------------");

    // === Deploy BondMarketplace ===
    const BondMarketplace = await ethers.getContractFactory("BondMarketPlace");
    const bondMarketplace = await BondMarketplace.deploy();
    await bondMarketplace.waitForDeployment();
    const bondMarketplaceAddress = await bondMarketplace.getAddress();
    console.log(`BondMarketplace deployed to: ${bondMarketplaceAddress}`);
    console.log("----------------------------------------------------");

    // === Create Bond ===
    console.log("Creating Bond...");
    const bondName = "Test Bond";
    const bondSymbol = "TBOND";
    const bondId = 1;
    const faceValue = ethers.parseUnits("1000", stablecoinDecimals); // Value of 1 whole bond in stablecoins (1000 * 10^6)
    const couponRate = 500; // 5.00% (basis points)
    const couponFrequency = 2; // Semi-annual
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const maturityDate = currentTimestamp + (365 * 24 * 60 * 60); // 1 year from now
    const tokensPerBond = 1000; // Fractionalization: 1 Bond = 1000 Tokens
    const tokenPrice = ethers.parseUnits("0.95", stablecoinDecimals); // Price per *individual token* (0.95 * 10^6)

    // Define the maximum number of WHOLE bonds conceptually
    const maxNumberOfWholeBonds = 100;
    console.log(`Max number of whole bonds defined: ${maxNumberOfWholeBonds}`);

    // --- Calculate the Maximum VALUE the bond can represent ---
    const maxBondValue = faceValue * BigInt(maxNumberOfWholeBonds);
    console.log(`Calculated maxBondValue (Max Stablecoin Value): ${ethers.formatUnits(maxBondValue, stablecoinDecimals)} ${tokenSymbol}`);
    // --- End Calculation ---

    // Call the factory function to create the bond contract
    console.log("Sending transaction to create TokenizedBond via BondFactory...");
    const createTx = await bondFactory.createTokenizedBond(
        bondName,               // string memory _bondName
        bondSymbol,             // string memory _bondSymbol
        bondId,                 // uint256 _bondId
        faceValue,              // uint256 _faceValue (per whole bond)
        couponRate,             // uint256 _couponRate (basis points)
        couponFrequency,        // uint256 _couponFrequency (payments per year)
        maturityDate,           // uint256 _maturityDate (Unix timestamp)
        player1.address,        // address _issuer
        mockStablecoinAddress,  // address _stablecoinAddress
        tokensPerBond,          // uint256 _tokensPerBond
        tokenPrice,             // uint256 _tokenPrice (per individual token)
        maxBondValue            // uint256 _maxBondSupply (representing MAX VALUE)
    );

    // Wait for the transaction to be mined
    console.log("Waiting for bond creation transaction confirmation...");
    const receipt = await createTx.wait(1); // Wait for 1 block confirmation
    console.log(`✅ Bond ${bondId} created successfully. Tx Hash: ${receipt.hash}, Block: ${receipt.blockNumber}`);

    // Get the deployed address of the newly created TokenizedBond contract
    const bondAddress = await bondFactory.bondIdToAddress(bondId);
    console.log(`✅ Bond ${bondId} contract deployed at address: ${bondAddress}`);

    // Get an ethers contract instance for interacting with the specific TokenizedBond contract
    const tokenizedBond = await ethers.getContractAt("TokenizedBond", bondAddress);
    console.log("Got TokenizedBond contract instance for interaction.");
    console.log("----------------------------------------------------");

    // === Save Deployment Info ===
    const network = await ethers.provider.getNetwork();
    const deploymentInfo = {
        network: network.name,
        networkId: network.chainId.toString(),
        mockStablecoinAddress: mockStablecoinAddress,
        bondFactoryAddress: bondFactoryAddress,
        bondMarketplaceAddress: bondMarketplaceAddress,
        bondInfo: {
            bondId: bondId.toString(),
            bondAddress: bondAddress,
            issuer: player1.address,
            tokenPrice: ethers.formatUnits(tokenPrice, stablecoinDecimals),
            bondSymbol: bondSymbol,
            stablecoinSymbol: tokenSymbol,
            stablecoinDecimals: stablecoinDecimals,
        },
        deployer: deployer.address,
        deploymentTime: new Date().toISOString()
    };
    fs.writeFileSync(
        "deployment-info.json",
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("Deployment info saved to deployment-info.json");
    console.log("----------------------------------------------------");

    // === Fund Bond Contract (Issuer deposits collateral via Direct Transfer) ===
    console.log("Funding Bond Contract (via direct transfer)...");
    const bondAmountToMintInitially = 10; // Issuer mints 10 whole bonds initially

    // Calculate required reserve for the initially minted bonds
    const numCoupons = Math.floor(((maturityDate - currentTimestamp) * couponFrequency) / (365 * 24 * 60 * 60));
    const couponPaymentPerBond = (faceValue * BigInt(couponRate) * BigInt(numCoupons)) / (BigInt(10000) * BigInt(couponFrequency));
    const principalPerBond = faceValue;
    const totalRequiredPerBond = couponPaymentPerBond + principalPerBond;
    const totalRequiredForInitialMint = totalRequiredPerBond * BigInt(bondAmountToMintInitially);

    // Add buffer (e.g., 10%)
    const reserveAmount = (totalRequiredForInitialMint * BigInt(110)) / BigInt(100);
    console.log(`Calculated reserve needed for ${bondAmountToMintInitially} bonds: ${ethers.formatUnits(reserveAmount, stablecoinDecimals)} ${tokenSymbol}`);

    // --- Get Stablecoins for Player1 (Issuer) ---
    // 1. Mint stablecoins to Deployer
    console.log(`Minting ${ethers.formatUnits(reserveAmount, stablecoinDecimals)} ${tokenSymbol} to deployer ${deployer.address}...`);
    try {
        const mintTx = await mockStablecoin.mint(deployer.address, reserveAmount);
        await mintTx.wait(1);
        console.log(`Minted to deployer successfully.`);
        const deployerBalance = await mockStablecoin.balanceOf(deployer.address);
        if (deployerBalance < reserveAmount) throw new Error("Deployer balance too low after mint.");
    } catch (error) {
        console.error("Error minting to deployer:", error);
        process.exit(1);
    }

    // 2. Transfer stablecoins from Deployer to Player1 (Issuer)
    console.log(`Transferring ${ethers.formatUnits(reserveAmount, stablecoinDecimals)} ${tokenSymbol} from deployer to player1 ${player1.address}...`);
    try {
        const transferTx = await mockStablecoin.transfer(player1.address, reserveAmount);
        await transferTx.wait(1);
        console.log(`Transferred to player1 successfully.`);
        const player1Balance = await mockStablecoin.balanceOf(player1.address);
        console.log(`Player1 ${tokenSymbol} balance: ${ethers.formatUnits(player1Balance, stablecoinDecimals)}`);
        if (player1Balance < reserveAmount) throw new Error("Player1 balance too low after transfer.");
    } catch (error) {
        console.error("Error transferring to player1:", error);
        process.exit(1);
    }
    // --- End Getting Stablecoins for Player1 ---

    // --- Direct Transfer to Fund Bond Contract ---
    console.log(`Player1 directly transferring ${ethers.formatUnits(reserveAmount, stablecoinDecimals)} ${tokenSymbol} to bond contract ${bondAddress}...`);
    try {
        // Ensure Player1 still has the balance just before transferring
        const currentP1Balance = await mockStablecoin.balanceOf(player1.address);
        if (currentP1Balance < reserveAmount) {
             throw new Error(`Player1 balance (${ethers.formatUnits(currentP1Balance, stablecoinDecimals)}) insufficient for transfer (${ethers.formatUnits(reserveAmount, stablecoinDecimals)})`);
        }

        // Execute the direct transfer from Player1 to the Bond Contract address
        const directTransferTx = await mockStablecoin.connect(player1).transfer(bondAddress, reserveAmount);
        await directTransferTx.wait(1);
        console.log(`Direct transfer to bond contract successful.`);

        // Verify bond contract balance
        const bondBalance = await mockStablecoin.balanceOf(bondAddress);
        console.log(`Bond contract ${tokenSymbol} balance: ${ethers.formatUnits(bondBalance, stablecoinDecimals)}`);
        if (bondBalance < reserveAmount) {
            console.warn("Warning: Bond balance seems low after direct transfer.");
        }

    } catch (error) {
        console.error("Error during direct transfer from Player1 to Bond contract:", error);
        // If this fails, check MockStablecoin.sol's transfer function and TokenizedBond's receive()/fallback()
        process.exit(1);
    }
    // --- End Direct Transfer ---
    console.log("----------------------------------------------------");

    // === Mint Initial Bond Tokens (by Issuer) ===
    console.log(`Issuer (Player1) minting ${bondAmountToMintInitially} initial whole bonds...`);
    try {
        // The 'mintBond' function in BondFactory likely handles minting the corresponding *tokens*
        const mintBondTx = await bondFactory.connect(player1).mintBond(
            bondAddress,
            player1.address, // Mint to issuer first
            bondAmountToMintInitially
        );
        await mintBondTx.wait(1);
        const issuerBondTokenBalance = await tokenizedBond.balanceOf(player1.address);
        // Total tokens = bondAmountToMintInitially * tokensPerBond
        const expectedTokens = BigInt(bondAmountToMintInitially) * BigInt(tokensPerBond);
        console.log(`Minted ${bondAmountToMintInitially} bonds (${ethers.formatUnits(issuerBondTokenBalance, 0)} ${bondSymbol} tokens) to issuer ${player1.address}`);
        if (issuerBondTokenBalance !== expectedTokens) {
            console.warn(`Warning: Issuer balance (${issuerBondTokenBalance}) does not match expected (${expectedTokens})`);
        }
    } catch (error) {
        console.error("Error minting initial bonds:", error);
        process.exit(1);
    }
    console.log("----------------------------------------------------");

    // === List Bond on Marketplace ===
    const bondDetails = await bondFactory.getActiveBondDetailsByBondId(bondId); // Get potentially updated details
    const currentTokenPrice = bondDetails.tokenPrice; // Use price from contract state

    const tokensToList = BigInt(5) * BigInt(tokensPerBond); // List tokens equivalent to 5 whole bonds
    console.log(`Issuer (Player1) listing ${ethers.formatUnits(tokensToList, 0)} ${bondSymbol} tokens on marketplace...`);

    // 1. Issuer approves Marketplace to transfer Bond Tokens
    console.log(`Player1 approving marketplace ${bondMarketplaceAddress} to transfer ${ethers.formatUnits(tokensToList, 0)} ${bondSymbol} tokens...`);
    try {
        const approveMarketplaceTx = await tokenizedBond.connect(player1).approve(
            bondMarketplaceAddress,
            tokensToList
        );
        await approveMarketplaceTx.wait(1);
        console.log("Marketplace approved for bond tokens successfully.");
        const marketAllowance = await tokenizedBond.allowance(player1.address, bondMarketplaceAddress);
         if (marketAllowance < tokensToList) throw new Error("Marketplace allowance too low after approval.");
    } catch (error) {
        console.error("Error approving marketplace for bond tokens:", error);
        process.exit(1);
    }

    // 2. Issuer calls listBond on Marketplace
    //    listBond function takes (bondId, bondAddress, pricePerToken)
    console.log(`Player1 calling listBond for Bond ID ${bondId} at price ${ethers.formatUnits(currentTokenPrice, stablecoinDecimals)} ${tokenSymbol}/token.`); // Adjusted log message
    try {
        const listTx = await bondMarketplace.connect(player1).listBond(
            bondId,             // Arg 1: uint256
            bondAddress,        // Arg 2: address
            currentTokenPrice   // Arg 3: uint256 (price per token)
        );
        await listTx.wait(1);
        // Although the list function doesn't take the amount, we log the issuer's *intent* and the fact they approved this amount
        console.log(`✅ Player1 listed bond #${bondId} on marketplace. (Approved ${ethers.formatUnits(tokensToList, 0)} ${bondSymbol} tokens for sale)`);
    } catch (error) {
        console.error("Error listing bond on marketplace:", error);
        process.exit(1);
    }
    console.log("----------------------------------------------------");

    // === Purchase Bond Tokens (Player2 buys) ===
    const tokensToBuy = BigInt(2) * BigInt(tokensPerBond); // Buy tokens equivalent to 2 whole bonds
    // Calculate cost based on the price fetched from the contract state
    const totalCost = (tokensToBuy * currentTokenPrice) / (BigInt(10) ** BigInt(0)); // Simple multiplication as price is likely base units
    console.log(`Player 2 attempting to buy ${ethers.formatUnits(tokensToBuy, 0)} ${bondSymbol} tokens...`);
    console.log(`Calculated cost: ${ethers.formatUnits(totalCost, stablecoinDecimals)} ${tokenSymbol}`);

    // --- Get Stablecoins for Player 2 (Buyer) ---
    // 1. Mint stablecoins to Deployer
    console.log(`Minting ${ethers.formatUnits(totalCost, stablecoinDecimals)} ${tokenSymbol} to deployer ${deployer.address} (for Player2)...`);
     try {
        const mintTx = await mockStablecoin.mint(deployer.address, totalCost);
        await mintTx.wait(1);
        console.log(`Minted to deployer successfully.`);
        const dBal = await mockStablecoin.balanceOf(deployer.address);
        if(dBal < totalCost) throw new Error("Deployer balance too low after mint (P2)");
    } catch (error) {
        console.error("Error minting to deployer (for Player2):", error);
        process.exit(1);
    }

    // 2. Transfer stablecoins from Deployer to Player2
    console.log(`Transferring ${ethers.formatUnits(totalCost, stablecoinDecimals)} ${tokenSymbol} from deployer to player2 ${player2.address}...`);
    try {
        const transferTx = await mockStablecoin.transfer(player2.address, totalCost);
        await transferTx.wait(1);
        console.log(`Transferred to player2 successfully.`);
        const player2StablecoinBalance = await mockStablecoin.balanceOf(player2.address);
        console.log(`Player2 ${tokenSymbol} balance: ${ethers.formatUnits(player2StablecoinBalance, stablecoinDecimals)}`);
        if (player2StablecoinBalance < totalCost) throw new Error("Player2 balance too low after transfer.");
    } catch (error) {
        console.error("Error transferring to player2:", error);
        process.exit(1);
    }
    // --- End Getting Stablecoins for Player 2 ---

    // 3. Player2 approves BOTH Marketplace AND TokenizedBond contract to spend stablecoins

    // 3a. Approve Marketplace (Maybe needed for other functions, less critical for this specific purchase path)
    console.log(`Player2 approving marketplace ${bondMarketplaceAddress} to spend ${ethers.formatUnits(totalCost, stablecoinDecimals)} ${tokenSymbol}...`);
    try {
        const approveMarketplaceStablecoinTx = await mockStablecoin.connect(player2).approve(
            bondMarketplaceAddress,
            totalCost
        );
        await approveMarketplaceStablecoinTx.wait(1);
        console.log("Marketplace approved for stablecoins successfully.");
        const marketStablecoinAllowance = await mockStablecoin.allowance(player2.address, bondMarketplaceAddress);
        // You might check this allowance if other marketplace functions directly pull funds
        // console.log(`Marketplace allowance from Player2: ${ethers.formatUnits(marketStablecoinAllowance, stablecoinDecimals)}`);
    } catch (error) {
        console.error("Error approving marketplace for stablecoins:", error);
        process.exit(1);
    }

    // 3b. Approve TokenizedBond contract (ESSENTIAL for purchaseBondFor's transferFrom)
    console.log(`Player2 approving TokenizedBond contract ${bondAddress} to spend ${ethers.formatUnits(totalCost, stablecoinDecimals)} ${tokenSymbol}...`);
    try {
        const approveBondContractStablecoinTx = await mockStablecoin.connect(player2).approve(
            bondAddress, // <<< Approve the ACTUAL bond contract
            totalCost
        );
        await approveBondContractStablecoinTx.wait(1);
        console.log("TokenizedBond contract approved for stablecoins successfully.");
        const bondContractStablecoinAllowance = await mockStablecoin.allowance(player2.address, bondAddress);
         // Add a check here to be sure the allowance is sufficient
        if (bondContractStablecoinAllowance < totalCost) {
             throw new Error(`TokenizedBond contract stablecoin allowance (${ethers.formatUnits(bondContractStablecoinAllowance, stablecoinDecimals)}) too low after approval (needs ${ethers.formatUnits(totalCost, stablecoinDecimals)}).`);
        } else {
             console.log(`Allowance check for TokenizedBond contract passed (${ethers.formatUnits(bondContractStablecoinAllowance, stablecoinDecimals)} ${tokenSymbol}).`);
        }
    } catch (error) {
        console.error("Error approving TokenizedBond contract for stablecoins:", error);
        process.exit(1);
    }

    // 4. Player2 calls purchaseBond on Marketplace
    //    This internally calls purchaseBondFor on the TokenizedBond contract
    console.log(`Player2 calling purchaseBond for Bond ID ${bondId}, amount ${ethers.formatUnits(tokensToBuy, 0)} tokens...`);
    const p1StablecoinBalBefore = await mockStablecoin.balanceOf(player1.address);
    const p2BondBalBefore = await tokenizedBond.balanceOf(player2.address);
    const bondContractBalBefore = await mockStablecoin.balanceOf(bondAddress); // Check bond contract stablecoin balance before
    try {
        const purchaseTx = await bondMarketplace.connect(player2).purchaseBond(
            bondId,
            tokensToBuy
        );
        await purchaseTx.wait(1);
        console.log(`✅ Player2 purchased ${ethers.formatUnits(tokensToBuy, 0)} ${bondSymbol} tokens.`);

        // Log balances after purchase
        const p1StablecoinBalAfter = await mockStablecoin.balanceOf(player1.address); // Issuer doesn't get funds directly here
        const p2StablecoinBalAfter = await mockStablecoin.balanceOf(player2.address);
        const p1BondBalAfter = await tokenizedBond.balanceOf(player1.address);
        const p2BondBalAfter = await tokenizedBond.balanceOf(player2.address);
        const bondContractBalAfter = await mockStablecoin.balanceOf(bondAddress); // Check bond contract stablecoin balance after

        console.log(`Player1 ${tokenSymbol} balance change: ${ethers.formatUnits(p1StablecoinBalAfter - p1StablecoinBalBefore, stablecoinDecimals)} (Should be 0 unless fees involved)`);
        console.log(`Player2 ${tokenSymbol} balance: ${ethers.formatUnits(p2StablecoinBalAfter, stablecoinDecimals)}`);
        console.log(`Player1 ${bondSymbol} token balance: ${ethers.formatUnits(p1BondBalAfter, 0)}`);
        console.log(`Player2 ${bondSymbol} token balance: ${ethers.formatUnits(p2BondBalAfter, 0)} (Change: +${ethers.formatUnits(p2BondBalAfter - p2BondBalBefore, 0)})`);
        console.log(`Bond Contract ${tokenSymbol} balance change: ${ethers.formatUnits(bondContractBalAfter - bondContractBalBefore, stablecoinDecimals)} (Should be +${ethers.formatUnits(totalCost, stablecoinDecimals)})`);


    } catch (error) {
        console.error("Error purchasing bond tokens:", error);
        process.exit(1);
    }
    console.log("----------------------------------------------------");


    // === Exchange Bond Tokens section commented out as Player3 is not used ===
    /*
    const tokenAmountToExchange = BigInt(1) * BigInt(tokensPerBond); // Exchange tokens for 1 whole bond
    console.log(`Player 2 attempting to exchange/gift ${ethers.formatUnits(tokenAmountToExchange, 0)} ${bondSymbol} tokens to Player 3...`);

    const player2BondBalanceBeforeExchange = await tokenizedBond.balanceOf(player2.address);
    const player3BondBalanceBeforeExchange = await tokenizedBond.balanceOf(player3.address); // Requires player3
    console.log(`Player2 current ${bondSymbol} balance: ${ethers.formatUnits(player2BondBalanceBeforeExchange, 0)}`);
    console.log(`Player3 current ${bondSymbol} balance: ${ethers.formatUnits(player3BondBalanceBeforeExchange, 0)}`);

    if (player2BondBalanceBeforeExchange < tokenAmountToExchange) {
         console.error("Error: Player2 does not have enough bond tokens to exchange.");
         process.exit(1);
    }

    // 1. Player2 approves Marketplace to transfer bond tokens for the exchange
    console.log(`Player2 approving marketplace ${bondMarketplaceAddress} to transfer ${ethers.formatUnits(tokenAmountToExchange, 0)} ${bondSymbol} tokens for exchange...`);
     try {
        const approveExchangeTx = await tokenizedBond.connect(player2).approve(
            bondMarketplaceAddress,
            tokenAmountToExchange
        );
        await approveExchangeTx.wait(1);
        console.log("Marketplace approved for exchange successfully.");
         const marketExchangeAllowance = await tokenizedBond.allowance(player2.address, bondMarketplaceAddress);
         if (marketExchangeAllowance < tokenAmountToExchange) throw new Error("Marketplace exchange allowance too low after approval.");
    } catch (error) {
        console.error("Error approving marketplace for bond token exchange:", error);
        process.exit(1);
    }

    // 2. Player2 calls exchangeBonds on Marketplace
    console.log(`Player2 calling exchangeBonds: From ${player2.address} To ${player3.address}, Amount ${ethers.formatUnits(tokenAmountToExchange, 0)}, Price 0 (gift)`);
    try {
        const exchangeTx = await bondMarketplace.connect(player2).exchangeBonds(
            bondId,
            player2.address, // from
            player3.address, // to (Requires player3)
            tokenAmountToExchange,
            0 // 0 price indicates a gift/direct transfer via marketplace logic
        );
        await exchangeTx.wait(1);
        console.log(`✅ Exchanged ${ethers.formatUnits(tokenAmountToExchange, 0)} ${bondSymbol} tokens from Player2 to Player3.`);

        // Log balances after exchange
        const player2BondBalanceAfterExchange = await tokenizedBond.balanceOf(player2.address);
        const player3BondBalanceAfterExchange = await tokenizedBond.balanceOf(player3.address); // Requires player3

        console.log(`Player2 ${bondSymbol} token balance: ${ethers.formatUnits(player2BondBalanceAfterExchange, 0)}`);
        console.log(`Player3 ${bondSymbol} token balance: ${ethers.formatUnits(player3BondBalanceAfterExchange, 0)}`);

    } catch (error) {
        console.error("Error exchanging bond tokens:", error);
        process.exit(1);
    }
    console.log("----------------------------------------------------");
    */

    console.log("\nDeployment and interaction script completed successfully!");
}

main().catch((error) => {
    console.error("\n💥 Deployment Script Failed:", error);
    process.exitCode = 1;
});
const fs = require("fs");
const { ethers } = require("hardhat");
const {logBondDetails} = require("../utils/loggers.js");
const BOND_CONTRACT_ARTIFACT_NAME = "TokenizedBond";

async function main() {
    // === Signers === (Same as before)
    const [deployer, player1, player2, player3, player4, player5] = await ethers.getSigners();
    const playerSigners = [player1, player2, player3, player4, player5];
    console.log("\n=== Signers ===");
    console.log("Deployer address:", deployer.address);
    playerSigners.forEach((player, index) => {
        console.log(`Player${index + 1} (Issuer/Buyer) address:`, player.address);
    });
    console.log("====================================================");

    // === Deploy MockStablecoin === (Same as before)
    console.log("\n=== Deploying MockStablecoin ===");
    const tokenName = "BondChain Coin";
    const tokenSymbol = "BCC";
    const stablecoinDecimals = 6;
    const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
    const mockStablecoin = await MockStablecoin.deploy(tokenName, tokenSymbol);
    await mockStablecoin.waitForDeployment();
    const mockStablecoinAddress = await mockStablecoin.getAddress();
    console.log(`MockStablecoin (${tokenSymbol}) deployed to: ${mockStablecoinAddress}`);
    console.log("Decimals:", stablecoinDecimals);
    console.log("====================================================");

    // === Deploy BondFactory === (Same as before)
    console.log("\n=== Deploying BondFactory ===");
    const BondFactory = await ethers.getContractFactory("BondFactory");
    const bondFactory = await BondFactory.deploy();
    await bondFactory.waitForDeployment();
    const bondFactoryAddress = await bondFactory.getAddress();
    console.log(`BondFactory deployed to: ${bondFactoryAddress}`);
    console.log("====================================================");

    // === Deploy BondMarketplace === (Same as before)
    console.log("\n=== Deploying BondMarketplace ===");
    const BondMarketplace = await ethers.getContractFactory("BondMarketPlace");
    const bondMarketplace = await BondMarketplace.deploy();
    await bondMarketplace.waitForDeployment();
    const bondMarketplaceAddress = await bondMarketplace.getAddress();
    console.log(`BondMarketplace deployed to: ${bondMarketplaceAddress}`);
    console.log("====================================================");

    // === Save Deployment Info ===
    const network = await ethers.provider.getNetwork();
    const deploymentInfo = {
        network: network.name,
        networkId: network.chainId.toString(),
        mockStablecoinAddress: mockStablecoinAddress,
        bondFactoryAddress: bondFactoryAddress,
        bondMarketplaceAddress: bondMarketplaceAddress,
        deployer: deployer.address,
        deploymentTime: new Date().toISOString()
    };
    fs.writeFileSync(
        "deployment-info.json",
        JSON.stringify(deploymentInfo, null, 2)
    );
    console.log("Deployment info saved to deployment-info.json");
    console.log("====================================================");

//============================================================================================================

    // === Dynamic Bond Creation  ===
    console.log(`\n=== Creating Bonds & Storing Instances ===`);
    const createdBondAddresses = {}; // Store results { bondId: address }
    const createdBondInstances = {}; // Store results { bondId: ethers.Contract instance } 
    let bondIdCounter = 1n;
    const bondsPerPlayer = 4;
    const bondsToFund = []; // Store { bondId, instance, issuerSigner, faceValue, maxBondSupply }
    let successfulMints = 0;

    const currentTimestamp = Math.floor(Date.now() / 1000);

    for (let i = 0; i < playerSigners.length; i++) {
        const issuerSigner = playerSigners[i];
        const playerIndex = i + 1;

        console.log(`\n--- Processing bonds for Player ${playerIndex} (${issuerSigner.address}) ---`);

        for (let j = 0; j < bondsPerPlayer; j++) {
            // Derive alphabets from ascii A-Z (65-90)
            const bondInstanceSuffix = String.fromCharCode(65 + j); // A, B, C, D...
            const currentBondId = bondIdCounter;

            console.log(`Attempting creation for Bond ID: ${currentBondId} (P${playerIndex}-${bondInstanceSuffix})...`);

            // --- Define unique parameters (Same logic as before) ---
            const bondName = `P${playerIndex} Bond ${bondInstanceSuffix}`;
            const bondSymbol = `P${playerIndex}B${bondInstanceSuffix}`;
            const faceValue = ethers.parseUnits((1000 + i * 200 + j * 100).toString(), stablecoinDecimals);
            const couponRate = (400n + BigInt(i * 50) + BigInt(j * 25));
            const couponFrequency = (j % 2 === 0) ? 2n : 4n; 
            const maturityYears = (j % 2 === 0) ? 2 : 3; 
            const maturityDate = currentTimestamp + (maturityYears * 365 * 24 * 60 * 60);
            const issuerAddress = issuerSigner.address;
            const tokensPerBond = 1000n;
            const tokenPriceStr = (j % 2 === 0) ? "0.99" : "1.01"; 
            const tokenPrice = ethers.parseUnits(tokenPriceStr, stablecoinDecimals);
            const maxBondSupply = (1n + BigInt(j * 20)); 
            const maxOfferingSizeRough = BigInt(maxBondSupply) * BigInt(faceValue) / (10n**BigInt(stablecoinDecimals));
            const maxOfferingSize = maxOfferingSizeRough;
            const totalFractionalTokensToExpect = maxBondSupply * tokensPerBond;

            try {
                // 1. Create Bond via Factory
                const createTx = await bondFactory.createTokenizedBond(
                    bondName, bondSymbol, currentBondId, faceValue, couponRate,
                    couponFrequency, maturityDate, issuerAddress, mockStablecoinAddress,
                    tokensPerBond, tokenPrice, maxBondSupply, maxOfferingSize
                );
                console.log(`  Tx sent (${createTx.hash}), waiting...`);
                const receipt = await createTx.wait();
                console.log(`  ✅ Bond (ID: ${currentBondId}) created! Gas: ${receipt.gasUsed.toString()}`);

                // 2. Retrieve Address
                const bondAddress = await bondFactory.bondIdToAddress(currentBondId);

                // 3. Get & Store Instance if Address is valid
                if (bondAddress && bondAddress !== ethers.ZeroAddress) {
                    console.log(`  Retrieved Address: ${bondAddress}`);
                    createdBondAddresses[currentBondId.toString()] = bondAddress;

                    
                    const tokenizedBondInstance = await ethers.getContractAt(
                        BOND_CONTRACT_ARTIFACT_NAME, // Make sure this matches your compiled contract name
                        bondAddress
                    );
                    createdBondInstances[currentBondId.toString()] = tokenizedBondInstance;
                    console.log(`  ✅ Stored ethers.js instance for Bond ID ${currentBondId}.`);

                    bondsToFund.push({
                        bondId: currentBondId,
                        instance: tokenizedBondInstance,
                        issuerSigner: issuerSigner,
                        faceValue: faceValue, // Store the BigInt value
                        maxBondSupply: maxBondSupply // Store the BigInt value
                    });
                    console.log(`  ✅ Stored instance and funding info for Bond ID ${currentBondId}.`);

                    // --- 3. Issuer Mints Initial Bond Tokens using mintBond ---
                    // We mint the entire maxBondSupply (as whole bonds) to the issuer
                    console.log(`  Attempting initial mint using mintBond(${issuerSigner.address}, ${maxBondSupply}) by issuer...`);
                    try {
                        // Call mintBond with issuer address and the max number of WHOLE bonds
                        const mintTx = await tokenizedBondInstance.connect(issuerSigner).mintBond(
                            issuerSigner.address, // to: the issuer themselves
                            maxBondSupply        // bondAmount: the maximum number of whole bonds allowed
                        );
                        await mintTx.wait();
                        console.log(`  ✅ Initial bond tokens minted via mintBond for Bond ID ${currentBondId}.`);
                        successfulMints++;

                        // --- 4. Verify Issuer's Bond Token Balance ---
                        const issuerBondBalance = await tokenizedBondInstance.balanceOf(issuerSigner.address);
                        const bondTokenSymbol = await tokenizedBondInstance.symbol();
                        console.log(`  Verification: Issuer ${issuerSigner.address} now holds ${issuerBondBalance.toString()} ${bondTokenSymbol} tokens.`);
                        // Verify against the calculated total fractional tokens
                        if (issuerBondBalance !== totalFractionalTokensToExpect) {
                            console.warn(`  ⚠️ Warning: Issuer balance (${issuerBondBalance}) does not match expected total fractional tokens (${totalFractionalTokensToExpect})!`);
                        }

                    } catch (mintError) {
                         // Improve error logging for mint failure
                        console.error(`  ❌ Error calling mintBond for Bond ID ${currentBondId}:`);
                        // Log the reason if available (often helpful for debugging contract reverts)
                        if (mintError.reason) {
                             console.error(`     Reason: ${mintError.reason}`);
                        } else {
                             console.error(mintError); // Log full error if no reason found
                        }
                    }

                } else {
                     console.error(`  💥 Failed to retrieve valid address for Bond ID ${currentBondId}! Cannot get instance or mint.`);
                }
            } catch (error) {
                 console.error(`  ❌ Error during creation/retrieval for Bond ID ${currentBondId}:`, error);
            }
            console.log("====================================================");

            bondIdCounter++; 
        } 
    } 

    // === Log Summary ===
    console.log("\n=== Creation Summary ===");
    const expectedBondCount = playerSigners.length * bondsPerPlayer;
    const retrievedAddressCount = Object.keys(createdBondAddresses).length;
    const storedInstanceCount = Object.keys(createdBondInstances).length; // <<< NEW SUMMARY POINT

    console.log(`Attempted to create: ${expectedBondCount} bonds.`);
    console.log(`Successfully retrieved addresses for: ${retrievedAddressCount} bonds.`);
    console.log(`Successfully stored ethers.js instances for: ${storedInstanceCount} bonds.`); // <<< NEW

    if (storedInstanceCount > 0) {
        console.log("\nStored Bond Instances (by ID):");
        for (const bondId in createdBondInstances) {
            console.log(`  Bond ID ${bondId}: Instance ready at address ${await createdBondInstances[bondId].getAddress()}`);
        }
    }

    if (storedInstanceCount < expectedBondCount) {
        console.log(`\n⚠️ ${expectedBondCount - storedInstanceCount} bond(s) may have failed during creation, address retrieval, or instance creation.`);
    }
    console.log("====================================================");


//============================================================================================================


    // === Try to use the stored instances ===
    console.log("\n=== Example Usage of Stored Instances ===");
    if (storedInstanceCount > 0) {
        const firstBondId = Object.keys(createdBondInstances)[0]; // Get the ID of the first created bond
        const firstBondInstance = createdBondInstances[firstBondId];
        const firstBondAddress = await firstBondInstance.getAddress(); // Get address from instance
        const firstBondName = await firstBondInstance.name(); // Call a view function
        
        console.log(`\n--- NOTE: Nothing is minted yet, this is just an example of how to use the stored instances ---`);
        console.log(`\nInteracting with Bond ID ${firstBondId} at ${firstBondAddress}`);
        console.log(`  Bond Name: ${firstBondName}`);

        try {
             const totalSupply = await firstBondInstance.totalSupply(); // Assuming ERC20/similar interface
             console.log(`  Total Supply: ${ethers.formatUnits(totalSupply, 0)} tokens`); // Assuming 0 decimals for the bond token itself for display
        } catch (e) { console.log("  Could not get totalSupply (maybe not implemented or needs different params).") }

        // factory takes care of registry, so we can call it directly to get details
        const bondDetails = await bondFactory.getBondDetailsByAddress(firstBondAddress);
        // alternatively, you can use the bondId to get details
        // const bondDetails = await bondFactory.getActiveBondDetailsByBondId(firstBondId);

        const issuerAddress = bondDetails.issuer; // Get issuer from contract state
        const issuerBalance = await firstBondInstance.balanceOf(issuerAddress);
        console.log(`  Issuer (${issuerAddress}) Balance: ${ethers.formatUnits(issuerBalance, 0)} tokens`);

    } else {
        console.log("No bond instances were stored, cannot run example usage.");
    }
    console.log("====================================================");


//===========================================================================================================


    console.log("\n=== Attempting to Modify a Bond ===");

    const bondIdToModify = 1n; // <<< CHOOSE WHICH BOND ID TO MODIFY
    const modifierSigner = player1; // <<< CHOOSE THE SIGNER (should be the issuer or authorized)

    // --- Check if the instance exists ---
    const bondInstanceToModify = createdBondInstances[bondIdToModify.toString()];

    if (!bondInstanceToModify) {
        console.log(`❌ Bond instance with ID ${bondIdToModify} not found in created instances. Cannot modify.`);
    } else {
        const bondAddress = await bondInstanceToModify.getAddress();
        console.log(`Targeting Bond ID ${bondIdToModify} at address ${bondAddress}`);
        console.log(`Modification will be attempted by: ${modifierSigner.address}`);


        // --- Define New Parameters ---
        const newCouponRate = 600n; // New rate: 6.00% (in basis points)
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const newMaturityDate = currentTimestamp + (3 * 365 * 24 * 60 * 60); // Extend maturity to 5 years from now
        const newMaxBondSupply = 150n; // Increase max supply
        const newTokenPrice = ethers.parseUnits("1.50", stablecoinDecimals); 
        const newMaxOfferingSize = ethers.parseUnits("75000", stablecoinDecimals); 

        console.log("\nNew Parameters for Modification:");
        console.log(`  New Coupon Rate (bps): ${newCouponRate}`);
        console.log(`  New Maturity Date (timestamp): ${newMaturityDate}`);
        console.log(`  New Max Bond Supply: ${newMaxBondSupply}`);
        console.log(`  New Token Price (units): ${newTokenPrice}`);
        console.log(`  New Max Offering Size (units): ${newMaxOfferingSize} (if applicable)`);

        try {

            const bondDetailsBefore = await bondFactory.getActiveBondDetailsByBondId(bondIdToModify)
            if (bondDetailsBefore.issuer !== modifierSigner.address) {
                 console.warn(`⚠️ WARNING: Attempting modification with ${modifierSigner.address}, but contract issuer is ${bondDetailsBefore.issuer}. Contract rules will apply.`);
            }

            console.log("\nSending modification transaction...");

            // --- Make the modification call ---
            const modifyTx = await bondInstanceToModify.connect(modifierSigner).modifyBond(
                newCouponRate,
                newMaturityDate,
                newMaxBondSupply,
                newTokenPrice,
                newMaxOfferingSize 
            );

            console.log(`  Transaction sent (Tx: ${modifyTx.hash}), waiting for confirmation...`);
            const receipt = await modifyTx.wait();
            console.log(`  ✅ Bond ID ${bondIdToModify} modified successfully! Gas used: ${receipt.gasUsed.toString()}`);

            console.log("\nVerifying changes on contract...");
            const bondDetailsAfter = await bondFactory.getActiveBondDetailsByBondId(bondIdToModify)

            // Compare relevant fields (adjust based on what getBondDetails returns)
            console.log(`  Coupon Rate: ${bondDetailsAfter.couponRate} (Expected: ${newCouponRate})`);
            console.log(`  Maturity Date: ${bondDetailsAfter.maturityDate} (Expected: ${newMaturityDate})`);
            console.log(`  Max Supply: ${bondDetailsAfter.maxBondSupply} (Expected: ${newMaxBondSupply})`);
            console.log(`  Token Price: ${bondDetailsAfter.tokenPrice} (Expected: ${newTokenPrice})`);
    } catch (error) {
        console.error(`❌ Error modifying Bond ID ${bondIdToModify}:`, error);
    }
        console.log("====================================================");
    }

 //===========================================================================================================   

    console.log("\n=== Funding Bond Contracts ===");

    // --- Calculate total funding needed per player ---
    const fundingPerPlayer = {}; // { playerAddress: totalAmount }
    const fundingPerBond = {}; // { bondId: amountToFund }

    for (const bondInfo of bondsToFund) {
        // Calculate required funding for the bond.
        const requiredFunding = bondInfo.faceValue * bondInfo.maxBondSupply;
        fundingPerBond[bondInfo.bondId.toString()] = requiredFunding;

        const issuerAddr = bondInfo.issuerSigner.address;
        if (!fundingPerPlayer[issuerAddr]) {
            fundingPerPlayer[issuerAddr] = 0n; 
        }
        fundingPerPlayer[issuerAddr] += requiredFunding; 

        console.log(`  Bond ID ${bondInfo.bondId}: Requires ${ethers.formatUnits(requiredFunding, stablecoinDecimals)} ${await mockStablecoin.symbol()}`);
    }
    console.log("==========================================");
    // --- Step 1: Deployer Mints Stablecoins directly to Players ---
    console.log("\n--- Deployer Minting Funds to Players ---");
    for (const playerAddress in fundingPerPlayer) {
        const totalAmount = fundingPerPlayer[playerAddress];
        if (totalAmount > 0n) {
            console.log(`  Minting ${ethers.formatUnits(totalAmount, stablecoinDecimals)} ${await mockStablecoin.symbol()} to Player ${playerAddress}...`);
            try {
                // Deployer owns MockStablecoin, so it can mint to players
                const mintTx = await mockStablecoin.connect(deployer).mint(playerAddress, totalAmount);
                await mintTx.wait();
                const playerBalance = await mockStablecoin.balanceOf(playerAddress);
                console.log(`  ✅ Minted. Player ${playerAddress} balance: ${ethers.formatUnits(playerBalance, stablecoinDecimals)}`);
            } catch (error) {
                 console.error(`  ❌ Error minting to ${playerAddress}:`, error);
            }
        }
    }

    // --- Step 2: Players Transfer Funds to their respective Bond Contracts ---
    console.log("\n--- Players Transferring Funds to Bonds ---");
    for (const bondInfo of bondsToFund) {
        const bondId = bondInfo.bondId.toString();
        const bondInstance = bondInfo.instance;
        const issuerSigner = bondInfo.issuerSigner;
        const amountToFund = fundingPerBond[bondId];
        const bondAddress = await bondInstance.getAddress();

        if (amountToFund > 0n) {
            console.log(`  Player ${issuerSigner.address} funding Bond ID ${bondId} (${bondAddress}) with ${ethers.formatUnits(amountToFund, stablecoinDecimals)} ${await mockStablecoin.symbol()}...`);
            try {
                // Player connects to stablecoin contract and transfers
                const transferTx = await mockStablecoin.connect(issuerSigner).transfer(bondAddress, amountToFund);
                await transferTx.wait();
                const bondBalance = await mockStablecoin.balanceOf(bondAddress);
                 console.log(`  ✅ Transferred. Bond ${bondId} balance: ${ethers.formatUnits(bondBalance, stablecoinDecimals)}`);
            } catch (error) {
                console.error(`  ❌ Error transferring from ${issuerSigner.address} to bond ${bondId}:`, error);
            }
        } else {
             console.log(`  Skipping funding for Bond ID ${bondId} (amount is zero).`);
        }
         console.log("----------------------------------------------------");
    }

    console.log("====================================================");

//===========================================================================================================
    // Verify funding
    for (const bondInfo of bondsToFund) {
        const bondId = bondInfo.bondId;
        const bondInstance = bondInfo.instance;
        const bondAddress = await bondInstance.getAddress();
        const expectedFunding = fundingPerBond[bondId.toString()] || 0n; // Get expected amount

        try {
            // Query the stablecoin balance OF the bond contract address
            const finalBalance = await mockStablecoin.balanceOf(bondAddress);

            console.log(`  Bond ID ${bondId} (${bondAddress}):`);
            console.log(`    Expected Funding: ${ethers.formatUnits(expectedFunding, stablecoinDecimals)} ${tokenSymbol}`);
            console.log(`    Actual Balance:   ${ethers.formatUnits(finalBalance, stablecoinDecimals)} ${tokenSymbol}`);

            // Optional: Add a check for discrepancy
            if (finalBalance !== expectedFunding) {
                console.warn(`    ⚠️ Discrepancy detected for Bond ID ${bondId}!`);
            } else {
                console.log(`    ✅ Balance matches expected funding.`);
            }

        } catch (error) {
            console.error(`  ❌ Error fetching balance for Bond ID ${bondId} (${bondAddress}):`, error);
        }
        console.log("============================================");

    }
//===========================================================================================================
    console.log("\n=== Minting Generous Stablecoin Balance to Players for Purchases ===");

    // Define a large amount (e.g., 1 Million stablecoins)
    // Use parseUnits to handle decimals correctly
    const largeAmountToMint = ethers.parseUnits("1000000", stablecoinDecimals);
    console.log(`Attempting to mint ${ethers.formatUnits(largeAmountToMint, stablecoinDecimals)} ${tokenSymbol} to each player (${playerSigners.length} players)...`);

    for (const player of playerSigners) {
        const playerAddress = player.address;
        console.log(`\n  Minting to Player ${playerAddress}...`);
        try {
            const mintTx = await mockStablecoin.connect(deployer).mint(playerAddress, largeAmountToMint);
            await mintTx.wait();

            // Verify the player's new balance
            const finalBalance = await mockStablecoin.balanceOf(playerAddress);
            console.log(`  ✅ Minted successfully.`);
            console.log(`  Player ${playerAddress} final ${tokenSymbol} balance: ${ethers.formatUnits(finalBalance, stablecoinDecimals)}`);

        } catch (error) {
            console.error(`  ❌ Error minting stablecoins to ${playerAddress}:`, error.reason || error);
        }
    }
    console.log("\n--- Player Stablecoin Funding Complete ---");
    console.log("====================================================");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Script failed:", error);
        process.exitCode = 1;
    });
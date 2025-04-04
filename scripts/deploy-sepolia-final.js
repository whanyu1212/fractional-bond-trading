const fs = require("fs");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const BOND_CONTRACT_ARTIFACT_NAME = "TokenizedBond";


async function main() {
    // === Signers === (Hy as the deployer and the rest as participants)ß
    const [deployer, player1, player2, player3, player4, player5] = await ethers.getSigners();
    const playerSigners = [player1, player2, player3, player4, player5];
    console.log("\n=== Signers ===");
    console.log("Deployer address:", deployer.address);
    playerSigners.forEach((player, index) => {
        console.log(`Player${index + 1} (Issuer/Buyer) address:`, player.address);
    });
    console.log("====================================================");

    // === Deploy MockStablecoin ===
    console.log("\n=== Deploying MockStablecoin ===");
    const tokenName = "BondChain Coin";
    const stablecoinSymbol = "BCC";
    const stablecoinDecimals = 6;
    const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
    const mockStablecoin = await MockStablecoin.deploy(tokenName, stablecoinSymbol);
    await mockStablecoin.waitForDeployment();
    const mockStablecoinAddress = await mockStablecoin.getAddress();
    console.log(`MockStablecoin (${stablecoinSymbol}) deployed to: ${mockStablecoinAddress}`);
    console.log("Decimals:", stablecoinDecimals);
    console.log("====================================================");

    // === Deploy BondFactory === 
    console.log("\n=== Deploying BondFactory ===");
    const BondFactory = await ethers.getContractFactory("BondFactory");
    const bondFactory = await BondFactory.deploy();
    await bondFactory.waitForDeployment();
    const bondFactoryAddress = await bondFactory.getAddress();
    console.log(`BondFactory deployed to: ${bondFactoryAddress}`);
    console.log("====================================================");

    // === Deploy BondMarketplace 
    console.log("\n=== Deploying BondMarketplace ===");
    const BondMarketplace = await ethers.getContractFactory("BondMarketPlace");
    const bondMarketplace = await BondMarketplace.deploy();
    await bondMarketplace.waitForDeployment();
    const bondMarketplaceAddress = await bondMarketplace.getAddress();
    console.log(`BondMarketplace deployed to: ${bondMarketplaceAddress}`);
    console.log("====================================================");

    // === Save Deployment Info ===
    // Writing deployment info to a JSON file
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
    const bondIssuers = {}; // Store results { bondId: issuerSigner }
    const bondCreationDetails = {}; // Store creation details { bondId: { tokenPrice: BigInt, tokensPerBond: BigInt, maturityDate: BigInt, faceValue: BigInt } }
    let bondIdCounter = 1n;
    const bondsPerPlayer = 4;
    const bondsToFund = []; // Store { bondId, instance, issuerSigner, faceValue, maxBondSupply }

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
            const pricePerWholeBond = tokenPrice * tokensPerBond; // e.g., $0.99 * 1000 = $990 (in units)
            // Calculate max offering size based on this issuance price per whole bond
            const maxOfferingSize = maxBondSupply * pricePerWholeBond;
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
                        BOND_CONTRACT_ARTIFACT_NAME, 
                        bondAddress
                    );
                    createdBondInstances[currentBondId.toString()] = tokenizedBondInstance;
                    console.log(`  ✅ Stored ethers.js instance for Bond ID ${currentBondId}.`);
                    bondIssuers[currentBondId.toString()] = issuerSigner; // Store the issuer signer
                    console.log(`  Issuer Signer: ${issuerSigner.address}`);
                    bondCreationDetails[currentBondId.toString()] = {
                        tokenPrice: tokenPrice,         // Needed for reference
                        tokensPerBond: tokensPerBond,     // Needed for calculations
                        maturityDate: maturityDate,       // <<< ADDED: Needed for maturity check
                        faceValue: faceValue            // <<< ADDED: Needed for redemption payout calc
                    }; // Store creation details
                    console.log(`  Token Price: ${ethers.formatUnits(tokenPrice, stablecoinDecimals)} ${stablecoinSymbol}`);
                    bondsToFund.push({
                        bondId: currentBondId,
                        instance: tokenizedBondInstance,
                        issuerSigner: issuerSigner,
                        faceValue: faceValue, // Store the BigInt value
                        maxBondSupply: maxBondSupply // Store the BigInt value
                    });
                    console.log(`  ✅ Stored instance and funding info for Bond ID ${currentBondId}.`);

                } else {
                     console.error(`  💥 Failed to retrieve valid address for Bond ID ${currentBondId}! Cannot get instance.`);
                }
            } catch (error) {
                 console.error(`  ❌ Error during creation/retrieval for Bond ID ${currentBondId}:`, error);
            }
            console.log("====================================================");

            bondIdCounter++; 
        } 
    } 

    //============================================================================================================

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
             const totalSupply = await firstBondInstance.totalSupply(); 
             console.log(`  Total Supply: ${ethers.formatUnits(totalSupply, 0)} tokens`); // We do not do upfront mint here, so this should be 0
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

    const bondIdToModify = 1n; // modifying the first bond created just for illustration
    const modifierSigner = player1; // player 1 is the corresponding signer for this bond

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
    
    // === Funding Bond Contracts ===
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
    console.log("====================================================");

    // --- Step 1: Deployer Mints Stablecoins directly to Players ---
    console.log("\n--- Deployer Minting Funds to Players ---");
    for (const playerAddress in fundingPerPlayer) {
        const totalAmount = fundingPerPlayer[playerAddress];
        if (totalAmount > 0n) {
            console.log(`  Minting ${ethers.formatUnits(totalAmount, stablecoinDecimals)} ${await mockStablecoin.symbol()} to Player ${playerAddress}...`);
            try {
                // Deployer owns MockStablecoin
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
            console.log(`    Expected Funding: ${ethers.formatUnits(expectedFunding, stablecoinDecimals)} ${stablecoinSymbol}`);
            console.log(`    Actual Balance:   ${ethers.formatUnits(finalBalance, stablecoinDecimals)} ${stablecoinSymbol}`);

            // Optional: Add a check for discrepancy
            if (finalBalance !== expectedFunding) {
                console.warn(`    ⚠️ Discrepancy detected for Bond ID ${bondId}!`);
            } else {
                console.log(`    ✅ Balance matches expected funding.`);
            }

        } catch (error) {
            console.error(`  ❌ Error fetching balance for Bond ID ${bondId} (${bondAddress}):`, error);
        }
        console.log(`\n--- Bond ID ${bondId} funding verification complete ---`);
        console.log("====================================================");

    }

    //===========================================================================================================
    console.log("\n=== Minting Generous Stablecoin Balance to Players for Purchases ===");
    // Assume we don't need the players to deposit
    // Define a large amount (e.g., 1 Million stablecoins)
    // Use parseUnits to handle decimals correctly
    const largeAmountToMint = ethers.parseUnits("1000000", stablecoinDecimals);
    console.log(`Attempting to mint ${ethers.formatUnits(largeAmountToMint, stablecoinDecimals)} ${stablecoinSymbol} to each player (${playerSigners.length} players)...`);

    for (const player of playerSigners) {
        const playerAddress = player.address;
        console.log(`\n  Minting to Player ${playerAddress}...`);
        try {
            const mintTx = await mockStablecoin.connect(deployer).mint(playerAddress, largeAmountToMint);
            await mintTx.wait();

            // Verify the player's new balance
            const finalBalance = await mockStablecoin.balanceOf(playerAddress);
            console.log(`  ✅ Minted successfully.`);
            console.log(`  Player ${playerAddress} final ${stablecoinSymbol} balance: ${ethers.formatUnits(finalBalance, stablecoinDecimals)}`);

        } catch (error) {
            console.error(`  ❌ Error minting stablecoins to ${playerAddress}:`, error.reason || error);
        }
    }
    console.log("\n--- Player Stablecoin Funding Complete ---");
    console.log("====================================================");

    //===========================================================================================================
    // === Listing Bonds on Marketplace ===
    console.log("\n=== Listing Bonds on Marketplace ===");
    let listedBondsCount = 0;
    const listingPrices = {}; // Store the price used for listing { bondId: price }
    const listedBondIds = []; // Store successfully listed bond IDs

    // Iterate through the bonds that were successfully created and have an instance
    for (const bondIdStr in createdBondInstances) {
        const bondId = BigInt(bondIdStr);
        const bondInstance = createdBondInstances[bondIdStr];
        const issuerSigner = bondIssuers[bondIdStr];
        const bondAddress = await bondInstance.getAddress();
        const creationPrice = bondCreationDetails[bondIdStr]?.tokenPrice;

        const listingPrice = creationPrice || ethers.parseUnits("1.00", stablecoinDecimals); // Default to 1.00 if creation price not found
        listingPrices[bondIdStr] = listingPrice; // Store for modification check later

        if (!issuerSigner) {
            console.log(`  Skipping listing for Bond ID ${bondId}: Issuer information missing.`);
            continue;
        }

        console.log(`\nAttempting to list Bond ID ${bondId} by Issuer ${issuerSigner.address}...`);
        console.log(`  Bond Address: ${bondAddress}`);
        console.log(`  Listing Price: ${ethers.formatUnits(listingPrice, stablecoinDecimals)} ${stablecoinSymbol} (${listingPrice} units)`);

        try {
            // The ISSUER connects to the marketplace contract and calls listBond
            const listTx = await bondMarketplace.connect(issuerSigner).listBond(
                bondId,
                bondAddress, 
                listingPrice
            );
            await listTx.wait();
            console.log(`  ✅ Bond ID ${bondId} listed successfully.`);
            listedBondsCount++;
            listedBondIds.push(bondId);

            // Optional Verification: Check marketplace state
            try {
                const marketListing = await bondMarketplace.bondListings(bondId);
                 if (marketListing.isListed && marketListing.listingPrice === listingPrice && marketListing.issuer === issuerSigner.address) {
                     console.log(`  Verification: Marketplace listing confirmed for Bond ID ${bondId}.`);
                 } else {
                     console.warn(`  ⚠️ Verification failed for Bond ID ${bondId} listing details!`);
                     console.log(`     Expected Issuer: ${issuerSigner.address}, Got: ${marketListing.issuer}`);
                     console.log(`     Expected Price: ${listingPrice}, Got: ${marketListing.listingPrice}`);
                     console.log(`     Expected Listed: true, Got: ${marketListing.isListed}`);
                 }
            } catch (verifyError) {
                 console.error(`  Error verifying marketplace listing for ${bondId}:`, verifyError);
            }

        } catch (error) {
            // Log specific revert reasons if available
            console.error(`  ❌ Error listing Bond ID ${bondId}:`, error.reason || error);
        }
    }
    console.log(`\n--- Bond Listing Complete: ${listedBondsCount} bonds listed on the marketplace ---`);
    console.log("====================================================");

    //===========================================================================================================

    console.log("\n=== Modifying a Bond Listing Price ===");

    // Let's try to modify the listing for the *first* bond we listed (if any)
    const bondIdsListed = Object.keys(listingPrices);

    if (bondIdsListed.length === 0) {
        console.log("No bonds were successfully listed, cannot attempt modification.");
    } else {
        const bondIdToModifyStr = bondIdsListed[0]; // Get the ID of the first listed bond
        const bondIdToModify = BigInt(bondIdToModifyStr);
        const modifierSigner = bondIssuers[bondIdToModifyStr]; // Get the original issuer
        const originalListingPrice = listingPrices[bondIdToModifyStr];

        // Define a new price (e.g., increase it slightly)
        const newListingPriceStr = "1.05"; // $1.05
        const newListingPrice = ethers.parseUnits(newListingPriceStr, stablecoinDecimals);

        console.log(`Attempting to modify listing for Bond ID ${bondIdToModify} by Issuer ${modifierSigner.address}...`);
        console.log(`  Original Listing Price: ${ethers.formatUnits(originalListingPrice, stablecoinDecimals)} ${stablecoinSymbol}`);
        console.log(`  New Listing Price: ${newListingPriceStr} ${stablecoinSymbol} (${newListingPrice} units)`);

        try {
            // The ISSUER connects to the marketplace and calls modifyListing
            const modifyTx = await bondMarketplace.connect(modifierSigner).modifyListing(
                bondIdToModify,
                newListingPrice
            );
            await modifyTx.wait();
            console.log(`  ✅ Listing for Bond ID ${bondIdToModify} modified successfully.`);

            // Verification
            try {
                const updatedListing = await bondMarketplace.bondListings(bondIdToModify);
                if (updatedListing.isListed && updatedListing.listingPrice === newListingPrice) {
                    console.log(`  Verification: Marketplace price updated successfully for Bond ID ${bondIdToModify}. New Price: ${ethers.formatUnits(updatedListing.listingPrice, stablecoinDecimals)}`);
                } else {
                    console.warn(`  ⚠️ Verification failed for price modification of Bond ID ${bondIdToModify}!`);
                    console.log(`     Expected Price: ${newListingPrice}, Got: ${updatedListing.listingPrice}`);
                    console.log(`     Listed Status: ${updatedListing.isListed}`);
                }
            } catch (verifyError) {
                console.error(`  Error verifying modified listing for ${bondIdToModify}:`, verifyError);
            }

        } catch (error) {
            console.error(`  ❌ Error modifying listing for Bond ID ${bondIdToModify}:`, error.reason || error);
        }
    }

    //===========================================================================================================

    console.log("\n=== Purchasing Bonds via Marketplace ===");

    // player 1 owns Bond 1-4
    // player 2 owns Bond 5-8
    // player 3 owns Bond 9-12
    // player 4 owns Bond 13-16
    // player 5 owns Bond 17-20

    // Let's fix the purchasing scenarios to use the correct bond IDs and amounts, just for illustration
    const purchaseScenarios = [
        { buyer: player2, bondIdToBuy: 10n, amount: 1n },
        { buyer: player3, bondIdToBuy: 6n, amount: 1n },
        { buyer: player1, bondIdToBuy: 8n, amount: 1n },
        { buyer: player4, bondIdToBuy: 1n, amount: 1n }, 
        { buyer: player5, bondIdToBuy: 15n, amount: 1n },
    ];

    for (const scenario of purchaseScenarios) {
        const { buyer, bondIdToBuy, amount } = scenario;
        const bondIdStr = bondIdToBuy.toString();

        console.log(`\n--- Scenario: ${buyer.address} purchasing ${amount} of Bond ID ${bondIdToBuy} ---`);

        // --- 1. Check if Bond and Instance Exist ... ---
        const bondInstance = createdBondInstances[bondIdStr];

        if (!bondInstance) { continue; }
        const bondAddress = await bondInstance.getAddress();

        try {
            console.log(`  Fetching CURRENT internal details from Bond Contract ${bondAddress}...`);
            const currentFractionInfo = await bondInstance.fractionInfo();
            const bondInternalTokenPrice = currentFractionInfo.tokenPrice; 
            const tokensPerWholeBond = currentFractionInfo.tokensPerBond;

            // --- 2. Check if the tokensPerWholeBond is zero ---
            if (tokensPerWholeBond === 0n) { 
                console.log(`  ❌ Cannot proceed: Fetched tokensPerBond is zero for Bond ID ${bondIdToBuy}.`);
                continue;
            }
            console.log(`  Current Bond Internal Token Price (fractional): ${ethers.formatUnits(bondInternalTokenPrice, stablecoinDecimals)}`);
            console.log(`  Current Bond Internal Tokens Per Bond: ${tokensPerWholeBond}`);


            // --- 3. Calculate REQUIRED Cost & Check Buyer Stablecoin Balance ---
            // cost = tokenPrice * tokensPerBond * amount (whole bonds)
            const requiredStablecoinCost = bondInternalTokenPrice * tokensPerWholeBond * amount;
            const buyerStablecoinBalance = await mockStablecoin.balanceOf(buyer.address);
            const fractionalTokensToReceive = amount * tokensPerWholeBond;

            console.log(`  REQUIRED Purchase Cost (based on CURRENT internal price): ${ethers.formatUnits(requiredStablecoinCost, stablecoinDecimals)} ${stablecoinSymbol} (${requiredStablecoinCost} units)`);
            if (buyerStablecoinBalance < requiredStablecoinCost) { continue; }


            // --- 4. Buyer Approves TokenizedBond Contract for REQUIRED Stablecoin Cost ---
            console.log(`  Approving TokenizedBond (${bondAddress}) to spend ${ethers.formatUnits(requiredStablecoinCost, stablecoinDecimals)} ${stablecoinSymbol} for ${buyer.address}...`);
            const approveTx = await mockStablecoin.connect(buyer).approve(
                bondAddress,
                requiredStablecoinCost // Approve for the amount the bond contract WILL charge
            );
            await approveTx.wait();
            console.log(`  ✅ TokenizedBond contract approved.`);

            const buyerStablecoinBefore = buyerStablecoinBalance;
            const buyerBondBalanceBefore = await bondInstance.balanceOf(buyer.address);

            // --- 5. Buyer Calls purchaseBond on Marketplace --- 
            console.log(`  Calling purchaseBond(${bondIdToBuy}, ${amount}) on marketplace for ${buyer.address}...`);
            const purchaseTx = await bondMarketplace.connect(buyer).purchaseBond(bondIdToBuy, amount);
            const purchaseReceipt = await purchaseTx.wait();
            console.log(`  ✅ Purchase transaction successful! Gas used: ${purchaseReceipt.gasUsed.toString()}`);

            // --- 6. Verify Results --- // Use requiredStablecoinCost for verification
            console.log(`  Verifying balances after purchase...`);
            const buyerStablecoinAfter = await mockStablecoin.balanceOf(buyer.address);
            const buyerBondBalanceAfter = await bondInstance.balanceOf(buyer.address);

            const expectedStablecoinAfter = buyerStablecoinBefore - requiredStablecoinCost; 
            const expectedBondBalanceAfter = buyerBondBalanceBefore + fractionalTokensToReceive;

            console.log(`    Buyer Stablecoin:`);
            console.log(`      Before: ${ethers.formatUnits(buyerStablecoinBefore, stablecoinDecimals)}`);
            console.log(`      After:  ${ethers.formatUnits(buyerStablecoinAfter, stablecoinDecimals)} (Expected: ${ethers.formatUnits(expectedStablecoinAfter, stablecoinDecimals)})`);
            if (buyerStablecoinAfter !== expectedStablecoinAfter) console.warn(`    ⚠️ Stablecoin balance mismatch!`);
            console.log(`    Buyer Bond Tokens (${await bondInstance.symbol()}):`);
            console.log(`      Before: ${buyerBondBalanceBefore.toString()}`);
            console.log(`      After:  ${buyerBondBalanceAfter.toString()} (Expected: ${expectedBondBalanceAfter.toString()})`);
            if (buyerBondBalanceAfter !== expectedBondBalanceAfter) console.warn(`    ⚠️ Bond token balance mismatch!`);

            const listing = await bondMarketplace.bondListings(bondIdToBuy); 
            const analytics = await bondMarketplace.bondAnalytics(bondIdToBuy);
            console.log(`    Marketplace Analytics: Trades=${analytics.numberOfTrades}, Volume=${ethers.formatUnits(analytics.totalTradingVolume, stablecoinDecimals)} (Uses Listing Price), LastPrice=${ethers.formatUnits(listing.listingPrice, stablecoinDecimals)} (Listing Price)`); // Clarified which price analytics uses

        } catch (error) {
            console.error(`  ❌ Error during purchase scenario for Bond ID ${bondIdToBuy} by ${buyer.address}:`, error.reason || error);
        }
        console.log("\n--- Bond Purchases Complete ---");
        console.log("====================================================");
    }

    console.log("\n=== Displaying Player Bond Holdings ===");

    // Loop through each player (player1 to player5)
    for (let i = 0; i < playerSigners.length; i++) {
        const player = playerSigners[i];
        const playerIndex = i + 1;
        console.log(`\n======= Querying Holdings for Player ${playerIndex} (${player.address}) =======`);

        // --- 1. Query Marketplace Internal State (via getUserMetrics) ---
        console.log(`\n  --- 1. Marketplace Internal Metrics & Positions (getUserMetrics) ---`);
        try {
            // Call the external getUserMetrics function on the deployed marketplace contract
            const metrics = await bondMarketplace.getUserMetrics(player.address);

            // Destructure the returned values: count, volume, and the array of IDs from internal analytics
            const [bondsHeldCount, totalVolume, activePositionIds] = metrics;

            // Log the general metrics tracked by the marketplace
            console.log(`    Marketplace Metrics:`);
            console.log(`      Bonds Held Count (Types): ${bondsHeldCount.toString()}`); // Based on userBondCount incremented during purchase
            console.log(`      Total Trading Volume (${stablecoinSymbol}): ${ethers.formatUnits(totalVolume, stablecoinDecimals)}`); // Based on userTradingVolume

            // Log the active positions according to the marketplace's internal holderBalances mapping
            if (activePositionIds.length === 0) {
                console.log(`    Marketplace analytics show Player ${playerIndex} holds no active bond positions.`);
            } else {
                console.log(`    Marketplace analytics show active positions in Bond IDs:`);
                // Convert BigInt array to string array for easy joining and logging
                console.log(`      [${activePositionIds.map(id => id.toString()).join(', ')}]`);
            }
        } catch (error) {
            // Catch potential errors during the getUserMetrics call
            console.error(`    ❌ Error calling getUserMetrics for Player ${playerIndex}:`, error.reason || error);
            if (!error.reason) console.error(error);
        }

        // --- 2. Query Actual Balances (getActualUserHoldingsWithDetails) ---
        console.log(`\n  --- 2. Actual Holdings via Contract Queries (getActualUserHoldingsWithDetails) ---`);
        try {
            const holdings = await bondMarketplace.getActualUserHoldingsWithDetails(player.address);

            // Destructure the returned arrays: IDs, Addresses, Balances
            const [bondIds, bondAddresses, balances] = holdings;

            // Check if any actual holdings were found
            if (bondIds.length === 0) {
                console.log(`    Player ${playerIndex} actually holds no bond tokens according to contract queries.`);
            } else {
                // Log the details for each bond the player actually holds
                console.log(`    Actual Holdings (${bondIds.length} position(s)):`);
                for (let k = 0; k < bondIds.length; k++) {
                    const bondId = bondIds[k];
                    const bondAddress = bondAddresses[k];
                    const balance = balances[k]; // This is the raw BigInt balance (fractional tokens)
                    let bondSymbol = '???'; // Default symbol if lookup fails

                    // Attempt to find the bond symbol using the instances stored earlier in the script
                    const bondInstance = createdBondInstances[bondId.toString()];
                    if (bondInstance) {
                        try {
                            // Call the .symbol() function on the stored contract instance
                            bondSymbol = await bondInstance.symbol();
                        } catch (symbolError) {
                            // Log a warning if fetching the symbol fails
                            console.warn(`      Warning: Could not fetch symbol for Bond ID ${bondId}`);
                        }
                    } else {
                        // Log a warning if the instance wasn't found in the script's map
                        console.warn(`      Warning: No script instance found for Bond ID ${bondId} to fetch symbol.`);
                    }

                    // Print the details for this specific bond holding
                    console.log(`      --------------------`);
                    console.log(`      Bond ID: ${bondId.toString()}`); // Use toString() for consistent display
                    console.log(`        Symbol: ${bondSymbol}`);
                    console.log(`        Contract: ${bondAddress}`);
                    console.log(`        Balance: ${balance.toString()} fractional tokens`); // Display the raw fractional token amount
                }
                console.log(`      --------------------`);
            }
        } catch (error) {
            // Catch potential errors during the getActualUserHoldingsWithDetails call
            console.error(`    ❌ Error calling getActualUserHoldingsWithDetails for Player ${playerIndex}:`, error.reason || error);
            if (!error.reason) console.error(error);
        }
        // Separator between players
        console.log(`=============================================================`);

    } 

    console.log("\n--- Player Holdings Display Complete ---");
    console.log("====================================================");

    //===========================================================================================================
    console.log("\n=== Exchanging Bonds via Marketplace (Gifting) ===");

    // --- Scenario Definition ---
    const exchangeScenario = {
        bondId: 1n,                  // Bond ID 1 (Issued by Player 1, potentially held by Player 4)
        senderSigner: player4,       // Player 4 is gifting
        receiverSigner: player2,     // Player 2 is receiving
        bondTokensToExchange: 500n,  // Gifting 500 fractional tokens (half of a whole bond if tokensPerBond=1000)
        stablecoinPayment: 0n         // It's a gift, so 0 stablecoin cost
    };
    const { bondId, senderSigner, receiverSigner, bondTokensToExchange, stablecoinPayment } = exchangeScenario;
    const bondIdStr = bondId.toString();

    console.log(`\n--- Scenario: Sender ${senderSigner.address}`);
    console.log(`             Gifting ${bondTokensToExchange.toString()} fractional tokens of Bond ID ${bondId}`);
    console.log(`             To Receiver ${receiverSigner.address} ---`);

    // --- 1. Get Bond Instance and Check Existence ---
    const bondInstance = createdBondInstances[bondIdStr];
    if (!bondInstance) {
        // Log error and skip if the bond instance wasn't created/stored earlier
        console.log(`  ❌ Cannot proceed: Instance for Bond ID ${bondId} not found in script storage.`);
        console.log(`----------------------------------------------------------`);
    } else {
        // Get necessary addresses and symbols for logging/interaction
        const bondAddress = await bondInstance.getAddress();
        let bondTokenSymbol = '???';
        try {
            bondTokenSymbol = await bondInstance.symbol();
        } catch {
            console.warn(`  Warning: Could not fetch symbol for Bond ID ${bondId}`);
        }

        // --- Main Exchange Logic within Try/Catch ---
        try {
            // --- 2. Check Sender's & Receiver's Initial Bond Token Balance ---
            const senderBalanceBefore = await bondInstance.balanceOf(senderSigner.address);
            const receiverBalanceBefore = await bondInstance.balanceOf(receiverSigner.address); // Get receiver's starting balance too
            console.log(`  Balances BEFORE Exchange (${bondTokenSymbol}):`);
            console.log(`    Sender (${senderSigner.address}): ${senderBalanceBefore.toString()}`);
            console.log(`    Receiver (${receiverSigner.address}): ${receiverBalanceBefore.toString()}`);

            // Verify sender has enough tokens
            if (senderBalanceBefore < bondTokensToExchange) {
                console.log(`  ❌ Cannot proceed: Sender has insufficient ${bondTokenSymbol} tokens (${senderBalanceBefore.toString()}) to gift ${bondTokensToExchange.toString()}.`);
                // Throw error to jump to catch block for this scenario
                throw new Error("Insufficient bond tokens for gift.");
            }

            // --- 3. Sender Approves Bond Contract to Spend Their Bond Tokens ---
            // The BondMarketplace delegates the actual token transfer to the specific Bond contract's
            // exchangeBonds function, which likely uses transferFrom. Therefore, the sender must
            // approve the Bond Contract address itself.
            console.log(`  Sender approving Bond Contract (${bondAddress}) to spend ${bondTokensToExchange.toString()} ${bondTokenSymbol} tokens...`);
            const approveTx = await bondInstance.connect(senderSigner).approve(
                bondAddress,          // Spender is the Bond Contract address
                bondTokensToExchange  // Amount is the number of fractional tokens
            );
            await approveTx.wait(); // Wait for approval transaction to be mined
            console.log(`  ✅ Bond Contract approved by sender for ${bondTokenSymbol} tokens.`);

            // --- 4. Initiate Exchange (Gift) via Marketplace ---
            // The transaction is initiated by calling the marketplace function.
            // Let's assume the sender initiates the call for this scenario.
            console.log(`  Sender calling exchangeBonds on marketplace (${bondMarketplaceAddress})...`);
            const exchangeTx = await bondMarketplace.connect(senderSigner).exchangeBonds(
                bondId,                 // bondId
                senderSigner.address,   // from address
                receiverSigner.address, // to address
                bondTokensToExchange,   // tokenAmount (fractional)
                stablecoinPayment       // stablecoinAmount (0 for gift)
            );
            const exchangeReceipt = await exchangeTx.wait(); // Wait for exchange transaction
            console.log(`  ✅ Exchange (Gift) transaction successful! Gas used: ${exchangeReceipt.gasUsed.toString()}`);

            // --- 5. Verify Results ---
            console.log(`  Verifying balances AFTER exchange...`);
            // Fetch balances again after the transaction
            const senderBalanceAfter = await bondInstance.balanceOf(senderSigner.address);
            const receiverBalanceAfter = await bondInstance.balanceOf(receiverSigner.address);
            // Fetch stablecoin balances (should not have changed)
            const senderStablecoin = await mockStablecoin.balanceOf(senderSigner.address);
            const receiverStablecoin = await mockStablecoin.balanceOf(receiverSigner.address);

            // Calculate expected balances
            const expectedSenderBalanceAfter = senderBalanceBefore - bondTokensToExchange;
            const expectedReceiverBalanceAfter = receiverBalanceBefore + bondTokensToExchange; // Use receiver's actual starting balance

            // Log bond token balances
            console.log(`    Sender ${bondTokenSymbol}:`);
            console.log(`      Before: ${senderBalanceBefore.toString()}`);
            console.log(`      After:  ${senderBalanceAfter.toString()} (Expected: ${expectedSenderBalanceAfter.toString()})`);
            console.log(`    Receiver ${bondTokenSymbol}:`);
            console.log(`      Before: ${receiverBalanceBefore.toString()}`); // Show actual starting balance
            console.log(`      After:  ${receiverBalanceAfter.toString()} (Expected: ${expectedReceiverBalanceAfter.toString()})`);
            // Log stablecoin balances
            console.log(`    Sender ${stablecoinSymbol} (Should be unchanged): ${ethers.formatUnits(senderStablecoin, stablecoinDecimals)}`);
            console.log(`    Receiver ${stablecoinSymbol} (Should be unchanged): ${ethers.formatUnits(receiverStablecoin, stablecoinDecimals)}`);

            // --- Basic Balance Checks ---
            let balancesMatch = true;
            if (senderBalanceAfter !== expectedSenderBalanceAfter) {
                console.warn(`    ⚠️ Sender bond token balance mismatch!`);
                balancesMatch = false;
            }
            if (receiverBalanceAfter !== expectedReceiverBalanceAfter) {
                console.warn(`    ⚠️ Receiver bond token balance mismatch!`);
                balancesMatch = false;
            }
            if (balancesMatch) {
                console.log(`    ✅ Bond token balances verified successfully.`);
            }

            // --- Optional: Verify marketplace analytics update ---
            console.log(`    Verifying marketplace analytics...`);
            try {
                // Get general analytics first (for trade count etc.)
                const analyticsSummary = await bondMarketplace.bondAnalytics(bondId);
                // Get specific holder balances using the dedicated getter
                const senderAnalyticsBalance = await bondMarketplace.getAnalyticsHolderBalance(bondId, senderSigner.address);
                const receiverAnalyticsBalance = await bondMarketplace.getAnalyticsHolderBalance(bondId, receiverSigner.address);

                console.log(
                    `    Marketplace Analytics: Trades=${analyticsSummary.numberOfTrades}, Sender Balance (Analytics): ${senderAnalyticsBalance.toString()}, Receiver Balance (Analytics): ${receiverAnalyticsBalance.toString()}`
                );

            } catch (analyticsError) {
                console.error("     Error fetching/displaying marketplace analytics:", analyticsError);
            }

        // --- Catch block for errors during the exchange process ---
        } catch (error) {
            console.error(`  ❌ Error during exchange scenario for Bond ID ${bondId}:`, error.reason || error);
            if (!error.reason) console.error(error);
        }
    }

    console.log("\n--- Bond Exchanges Complete ---");
    console.log("====================================================");

    //===========================================================================================================
    // console.log("\n=== Simulating Time Passing for Coupon Payments ===");

    // const sixMonthsOneDay = (183 * 24 * 60 * 60); // Approx 6 months in seconds + 1 day buffer
    // console.log(`Advancing time by ~6 months (${sixMonthsOneDay} seconds)...`);

    // await time.increase(sixMonthsOneDay);

    // // The new timestamp after advancing time for 6 months and 1 day
    // const newTimestamp = await time.latest();

    // console.log(`✅ Time advanced. Current block timestamp: ${newTimestamp}`);
    // console.log("====================================================");

    // console.log("\n=== Claiming Coupons via Marketplace (multiClaimCoupons) ===");

    // // --- 1. Identify Potential Claimers and Bonds ---
    // const bondIdsToClaimFor = [];
    // const claimersPerBond = []; // Array of arrays: address[][]
    // const claimerStablecoinBefore = {}; // Track balances before { address: balance }

    // console.log("Identifying current bond holders to attempt claims...");
    // for (let i = 0; i < playerSigners.length; i++) {
    //     const player = playerSigners[i];
    //     try {
    //         const holdings = await bondMarketplace.getActualUserHoldingsWithDetails(player.address);
    //         const [heldBondIds, , balances] = holdings; // We only need IDs and confirmation of balance>0

    //         for (let k = 0; k < heldBondIds.length; k++) {
    //             const bondId = heldBondIds[k];
    //             const balance = balances[k];

    //             if (balance > 0n) { // If player actually holds tokens for this bond
    //                 const bondIdStr = bondId.toString();
    //                 // Find the index for this bondId in our arrays
    //                 let bondIndex = bondIdsToClaimFor.findIndex(id => id === bondId);

    //                 if (bondIndex === -1) {
    //                     // If this bondId isn't in our list yet, add it
    //                     bondIdsToClaimFor.push(bondId);
    //                     claimersPerBond.push([]); // Add an empty array for its claimers
    //                     bondIndex = bondIdsToClaimFor.length - 1; // Get the new index
    //                 }

    //                 // Add this player to the list of claimers for this bond
    //                 if (!claimersPerBond[bondIndex].includes(player.address)) {
    //                     claimersPerBond[bondIndex].push(player.address);
    //                      console.log(`  -> Marked Player ${i+1} (${player.address}) to claim for Bond ID ${bondId}`);

    //                     // Store stablecoin balance before claim
    //                      if (!claimerStablecoinBefore[player.address]) {
    //                         claimerStablecoinBefore[player.address] = await mockStablecoin.balanceOf(player.address);
    //                      }
    //                 }
    //             }
    //         }
    //     } catch (error) {
    //         console.error(`  Error identifying holdings for Player ${i+1}: ${error}`);
    //     }
    // }

    // // --- 2. Check if there's anything to claim ---
    // if (bondIdsToClaimFor.length === 0) {
    //     console.log("\nNo holders identified with positive balances. Skipping multiClaimCoupons call.");
    // } else {
    //     console.log("\n--- Prepared Data for multiClaimCoupons ---");
    //     console.log("Bond IDs:", bondIdsToClaimFor.map(id => id.toString()));

    //     // --- 3. Call multiClaimCoupons ---
    //     console.log("\nCalling multiClaimCoupons on marketplace...");
    //     try {
    //         // Use deployer or any player to initiate the call
    //         const claimTx = await bondMarketplace.connect(deployer).multiClaimCoupons(
    //             bondIdsToClaimFor,
    //             claimersPerBond
    //         );
    //         const claimReceipt = await claimTx.wait();
    //         console.log(`✅ multiClaimCoupons transaction successful! Gas used: ${claimReceipt.gasUsed.toString()}`);

    //         // --- 4. Log Results from Transaction ---
    //         console.log("\n--- Verifying Stablecoin Balances After Claim ---");
    //         for (const playerAddress in claimerStablecoinBefore) {
    //             const balanceBefore = claimerStablecoinBefore[playerAddress];
    //             const balanceAfter = await mockStablecoin.balanceOf(playerAddress);
    //             const difference = balanceAfter - balanceBefore;

    //             console.log(`  Player ${playerAddress}:`);
    //             console.log(`    Balance Before: ${ethers.formatUnits(balanceBefore, stablecoinDecimals)} ${stablecoinSymbol}`);
    //             console.log(`    Balance After:  ${ethers.formatUnits(balanceAfter, stablecoinDecimals)} ${stablecoinSymbol}`);
    //             if (difference > 0n) {
    //                 console.log(`    💰 Received: ${ethers.formatUnits(difference, stablecoinDecimals)} ${stablecoinSymbol}`);
    //             } else {
    //                  console.log(`    (No change or potential issue)`);
    //             }
    //         }

    //     } catch (error) {
    //         console.error(`  ❌ Error calling multiClaimCoupons:`, error.reason || error);
    //         if (!error.reason) console.error(error);
    //     }
    // }
    // console.log("\n--- Coupon Claims Complete ---");
    // console.log("====================================================");

    //===========================================================================================================
    // console.log("\n=== Simulating Time Passing to Bond Maturity ===");

    // // Advance time significantly further to ensure most/all bonds mature.
    // // If the longest maturity was ~3 years from creation, let's add ~3 more years.
    // const threeYears = (3 * 365 * 24 * 60 * 60); // Approx seconds
    // console.log(`Advancing time by ~3 more years (${threeYears} seconds)...`);

    // await time.increase(threeYears);

    // const maturityCheckTimestamp = await time.latest();
    // console.log(`✅ Time advanced. Current block timestamp for maturity check: ${maturityCheckTimestamp}`);
    // console.log("====================================================");

    // //===========================================================================================================
    // // === UPDATING BOND MATURITY STATUS ON MARKETPLACE ===
    // console.log("\n=== Updating Bond Maturity Status on Marketplace ===");

    // const maturedBondIds = []; // Keep track of IDs marked as matured

    // // Iterate through all created bonds
    // for (const bondIdStr in createdBondInstances) {
    //     const bondId = BigInt(bondIdStr);
    //     const creationDetails = bondCreationDetails[bondIdStr]; // Fetch stored details

    //     if (!creationDetails || !creationDetails.maturityDate) {
    //         console.log(`  Skipping Bond ID ${bondId}: Maturity date not found in script storage.`);
    //         continue;
    //     }

    //     const maturityDate = creationDetails.maturityDate;

    //     // Check if current time is past the bond's maturity date
    //     if (maturityCheckTimestamp >= maturityDate) {
    //         console.log(`\n  Bond ID ${bondId} has matured (Maturity: ${maturityDate}, Current: ${maturityCheckTimestamp}).`);
    //         console.log(`  Attempting to update status on marketplace via deployer (${deployer.address})...`);

    //         try {
    //              // Check current status first (optional)
    //              const listingBefore = await bondMarketplace.bondListings(bondId);
    //              if (listingBefore.matured) {
    //                  console.log(`    Status already marked as matured on marketplace.`);
    //                  maturedBondIds.push(bondId); // Still add to our list
    //                  continue;
    //              }

    //             // Call updateBondMaturity as the deployer (marketplace owner)
    //             const updateTx = await bondMarketplace.connect(deployer).updateBondMaturity(
    //                 bondId,
    //                 true // Set matured status to true
    //             );
    //             await updateTx.wait();
    //             console.log(`  ✅ Marketplace status updated for Bond ID ${bondId}.`);
    //             maturedBondIds.push(bondId); // Add to list of successfully updated bonds

    //             // Verify marketplace state (optional)
    //             const listingAfter = await bondMarketplace.bondListings(bondId);
    //             if (!listingAfter.matured) {
    //                  console.warn(`  ⚠️ Verification failed: Marketplace status did not update for Bond ID ${bondId}.`);
    //             }

    //         } catch (error) {
    //             console.error(`  ❌ Error updating maturity status for Bond ID ${bondId}:`, error.reason || error);
    //         }
    //     } else {
    //         console.log(`  Bond ID ${bondId} has not matured yet.`);
    //     }
    // }
    // console.log(`\n--- Maturity Status Update Complete: ${maturedBondIds.length} bonds marked as matured ---`);
    // console.log("====================================================");

    //===========================================================================================================
    // === REDEEMING BONDS ===
    // console.log("\n=== Redeeming Bonds via Marketplace (multiRedeemBonds) ===");

    // // --- 1. Identify Potential Redeemers for Matured Bonds ---
    // const bondIdsToRedeemFor = [];
    // const redeemersPerBond = []; // Array of arrays: address[][]
    // const redeemerStablecoinBefore = {}; // Track balances before { address: balance }
    // const expectedPayouts = {}; // Track expected payout { address: totalPayout }
    // const bondsBeingRedeemed = {}; // Track bonds being redeemed { bondId: { faceValue: X, tokensPerBond: Y } }

    // console.log("Identifying holders of matured bonds to attempt redemptions...");

    // // Only loop through bonds confirmed as matured on the marketplace
    // for (const bondId of maturedBondIds) {
    //     const bondIdStr = bondId.toString();
    //     const bondInstance = createdBondInstances[bondIdStr];
    //     const creationDetails = bondCreationDetails[bondIdStr];

    //     if (!bondInstance || !creationDetails || !creationDetails.faceValue || !creationDetails.tokensPerBond) {
    //          console.warn(`  Skipping Bond ID ${bondId}: Instance or creation details (faceValue, tokensPerBond) missing.`);
    //          continue;
    //     }
    //     const faceValue = creationDetails.faceValue;
    //     const tokensPerBond = creationDetails.tokensPerBond;
    //     bondsBeingRedeemed[bondIdStr] = { faceValue, tokensPerBond }; // Store for payout calculation

    //     let foundHoldersForThisBond = false;
    //     const currentRedeemers = [];

    //     // Find all current holders for this specific matured bond
    //     for (let i = 0; i < playerSigners.length; i++) {
    //         const player = playerSigners[i];
    //         try {
    //             const balance = await bondInstance.balanceOf(player.address);

    //             if (balance > 0n) { // If player holds tokens for this matured bond
    //                 foundHoldersForThisBond = true;
    //                 currentRedeemers.push(player.address);
    //                 console.log(`  -> Marked Player ${i+1} (${player.address}) to redeem ${balance.toString()} tokens for Bond ID ${bondId}`);

    //                 // Store stablecoin balance before redemption
    //                 if (!redeemerStablecoinBefore[player.address]) {
    //                     redeemerStablecoinBefore[player.address] = await mockStablecoin.balanceOf(player.address);
    //                 }
    //                 // Calculate expected payout for this redemption
    //                 // Payout = (Fractional Tokens Redeemed * Face Value per Whole Bond) / Tokens per Whole Bond
    //                 const payout = (balance * faceValue) / tokensPerBond; // BigInt arithmetic
    //                 if (!expectedPayouts[player.address]) {
    //                     expectedPayouts[player.address] = 0n;
    //                 }
    //                 expectedPayouts[player.address] += payout; // Accumulate expected payout
    //             }
    //         } catch (balanceError) {
    //              console.error(`  Error checking balance for Player ${i+1} on Bond ID ${bondId}: ${balanceError}`);
    //         }
    //     }

    //     // If holders were found for this matured bond, add it to the batch call arrays
    //     if (foundHoldersForThisBond) {
    //         bondIdsToRedeemFor.push(bondId);
    //         redeemersPerBond.push(currentRedeemers);
    //     }
    // } // End loop through maturedBondIds

    // // --- 2. Check if there's anything to redeem ---
    // if (bondIdsToRedeemFor.length === 0) {
    //     console.log("\nNo holders identified for matured bonds. Skipping multiRedeemBonds call.");
    // } else {
    //     console.log("\n--- Prepared Data for multiRedeemBonds ---");
    //     console.log("Bond IDs:", bondIdsToRedeemFor.map(id => id.toString()));
    //     console.log("Redeemers per Bond:", redeemersPerBond); //

    //     // --- 3. Call multiRedeemBonds ---
    //     console.log("\nCalling multiRedeemBonds on marketplace...");
    //     try {
    //         // Use deployer or any player to initiate the call
    //         const redeemTx = await bondMarketplace.connect(deployer).multiRedeemBonds(
    //             bondIdsToRedeemFor,
    //             redeemersPerBond
    //         );
    //         const redeemReceipt = await redeemTx.wait();
    //         console.log(`✅ multiRedeemBonds transaction successful! Gas used: ${redeemReceipt.gasUsed.toString()}`);

    //         // --- 4. Verify Results ---
    //         console.log("\n--- Verifying Balances After Redemption ---");

    //         // Verify Stablecoin Balances of Redeemers
    //         console.log("  Verifying Redeemer Stablecoin Balances:");
    //         for (const playerAddress in redeemerStablecoinBefore) {
    //             const balanceBefore = redeemerStablecoinBefore[playerAddress];
    //             const balanceAfter = await mockStablecoin.balanceOf(playerAddress);
    //             const expectedPayout = expectedPayouts[playerAddress] || 0n;
    //             const expectedBalanceAfter = balanceBefore + expectedPayout;

    //             console.log(`    Player ${playerAddress}:`);
    //             console.log(`      Balance Before: ${ethers.formatUnits(balanceBefore, stablecoinDecimals)} ${stablecoinSymbol}`);
    //             console.log(`      Expected Payout: ${ethers.formatUnits(expectedPayout, stablecoinDecimals)} ${stablecoinSymbol}`);
    //             console.log(`      Balance After:  ${ethers.formatUnits(balanceAfter, stablecoinDecimals)} ${stablecoinSymbol} (Expected: ${ethers.formatUnits(expectedBalanceAfter, stablecoinDecimals)})`);
    //             if (balanceAfter !== expectedBalanceAfter) {
    //                 console.warn(`      ⚠️ Stablecoin balance mismatch!`);
    //             }
    //         }

    //         // Verify Bond Token Balances of Redeemers (should be 0 for redeemed bonds)
    //         console.log("\n  Verifying Redeemer Bond Token Balances:");
    //         for (let i = 0; i < bondIdsToRedeemFor.length; i++) {
    //             const bondId = bondIdsToRedeemFor[i];
    //             const bondIdStr = bondId.toString();
    //             const bondInstance = createdBondInstances[bondIdStr];
    //             const redeemers = redeemersPerBond[i];

    //             if (bondInstance) {
    //                 console.log(`    Checking Bond ID ${bondId}:`);
    //                 for (const redeemerAddress of redeemers) {
    //                     const balanceAfter = await bondInstance.balanceOf(redeemerAddress);
    //                     console.log(`      Redeemer ${redeemerAddress} Balance: ${balanceAfter.toString()} (Expected: 0)`);
    //                     if (balanceAfter !== 0n) {
    //                         console.warn(`      ⚠️ Bond token balance not zero after redemption!`);
    //                     }
    //                 }
    //             }
    //         }

    //          // Optional: Verify Stablecoin Balances of Bond Contracts
    //          console.log("\n  Verifying Bond Contract Stablecoin Balances (Should decrease):");
    //          // Need balances *before* redemption if exact decrease check is desired
    //          for (const bondId of bondIdsToRedeemFor) {
    //              const bondIdStr = bondId.toString();
    //              const bondInstance = createdBondInstances[bondIdStr];
    //              if (bondInstance) {
    //                  const bondAddress = await bondInstance.getAddress();
    //                  const balanceAfter = await mockStablecoin.balanceOf(bondAddress);
    //                  console.log(`    Bond ID ${bondId} (${bondAddress}) Balance: ${ethers.formatUnits(balanceAfter, stablecoinDecimals)} ${stablecoinSymbol}`);
    //              }
    //          }

    //     } catch (error) {
    //         console.error(`  ❌ Error calling multiRedeemBonds:`, error.reason || error);
    //         if (!error.reason) console.error(error);
    //     }
    // }
    // console.log("\n--- Bond Redemptions Complete ---");
    // console.log("====================================================");

    console.log("\n=== Script Execution Complete ===");
    console.log("====================================================");

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("💥 Script failed:", error);
        process.exitCode = 1;
    });
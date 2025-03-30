async function main() {
    const [deployer, issuer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);
    console.log("Issuer address:", issuer.address);
    
    // Deploy BondFactory
    const BondFactory = await ethers.getContractFactory("BondFactory");
    const bondFactory = await BondFactory.deploy();
    await bondFactory.waitForDeployment();
    console.log("BondFactory deployed to:", await bondFactory.getAddress());

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
        issuer.address,  // Use the issuer account, not the deployer
        "0x4b84D11FAD4dD6fb6277E055D0892023456eeCFc", // _stablecoinAddress
        tokensPerBond,
        bondPrice,
        maxBondSupply
    );

    // Wait for transaction to be mined
    const receipt = await createTx.wait();
    console.log("✅ Bond created successfully in block:", receipt.blockNumber);

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
        issuer: issuer,
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
    
    const modifyTx = await bondFactory.connect(issuer).modifyBond(
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
}

main().catch((error) => {
    console.error("Deployment failed:", error);
    process.exitCode = 1;
});
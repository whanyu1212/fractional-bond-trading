const { ethers } = require("hardhat");

async function logBondDetails(factory, bondIdOrAddress, label) {
    console.log(`\n--- ${label} ---`);
    try {
        let details;

        if (typeof bondIdOrAddress === 'string' && bondIdOrAddress.startsWith('0x')) {
            console.log(`Fetching details for address: ${bondIdOrAddress}`);
            details = await factory.getBondDetailsByAddress(bondIdOrAddress);
        } else {
            console.log(`Fetching details for Bond ID: ${bondIdOrAddress}`);
            details = await factory.getActiveBondDetailsByBondId(bondIdOrAddress);
        }

        console.log(`  Address: ${details.bondAddress}`);
        console.log(`  Bond ID: ${details.bondId.toString()}`);
        console.log(`  Name: ${details.name}`);
        console.log(`  Symbol: ${details.symbol}`);
        console.log(`  Issuer: ${details.issuer}`);
        console.log(`  Active: ${details.isActive}`);
        console.log(`  Stablecoin: ${details.stablecoinAddress}`);
        console.log(`  Face Value: ${ethers.formatUnits(details.faceValue, 6)}`);
        console.log(`  Coupon Rate: ${details.couponRate.toString()} bps`);
        console.log(`  Coupon Freq: ${details.couponFrequency.toString()}`);
        console.log(`  Maturity: ${new Date(Number(details.maturityDate) * 1000).toLocaleString()}`);
        console.log(`  Max Bond Supply: ${details.maxBondSupply.toString()}`);
        console.log(`  Tokens/Bond: ${details.tokensPerBond.toString()}`);
        console.log(`  Token Price: ${ethers.formatUnits(details.tokenPrice, 6)}`);
        console.log(`  Max Offering Size: ${ethers.formatUnits(details.maxOfferingSize, 6)}`);
        console.log(`  Total Raised: ${ethers.formatUnits(details.totalRaised, 6)}`);
        console.log(`  Created: ${new Date(Number(details.creationTimestamp) * 1000).toLocaleString()}`);
        if (!details.isActive) {
            console.log(`  Decommissioned: ${new Date(Number(details.decommissionTimestamp) * 1000).toLocaleString()}`);
        }
        console.log("----------------------------------------------------");

    } catch (error) {
        console.error(`Failed to fetch bond details for ${bondIdOrAddress}:`, error);
        console.log("----------------------------------------------------");
    }
}

module.exports = {
    logBondDetails
};
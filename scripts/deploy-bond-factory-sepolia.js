// Required libraries
const { ethers } = require("hardhat");

// Deployed contract address on Sepolia
const contractAddress = "0x9fDE71d5C11623257A46b3BEb64a8954CA7197E2";

// ABI of the deployed contract
const abi = [
  // createTokenizedBond function
  "function createTokenizedBond(string _name, string _symbol, uint256 _id, uint256 _faceValue, uint256 _couponRate, uint256 _couponFrequency, uint256 _maturityDate, address _issuer, address _stablecoinAddress, uint256 _tokensPerBond, uint256 _bondPrice, uint256 _maxBondSupply)",

  // modifyBond function
  "function getTotalBondCount() view returns (uint256)",

  // getActiveBondDetails function
  "function getActiveBondDetails(uint256 index) view returns (address, string, string, address, uint256, uint256)"
];

async function main() {
  // Connect to Sepolia via a provider
  const provider = new ethers.JsonRpcProvider("https://eth-sepolia.g.alchemy.com/v2/DnlhBkloOzZJNMp8aILWQrUxvV22cL3a");
    console.log("Provider initialized:", provider);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const contract = new ethers.Contract(contractAddress, abi, signer);

    const bondCount = await contract.getTotalBondCount();
    console.log("Total bonds count:", bondCount);

    const bondName = `Bond No.${bondCount}`;
    const bondSymbol = `TBOND${bondCount}`;
    const bondId = bondCount;
    const faceValue = ethers.parseUnits("1000", 6);  // 1000 USDC (6 decimals)
    const couponRate = 398;  // 5.00% (in basis points)
    const couponFrequency = 2;  // Semi-annual payments
    const maturityDate = 180000000;  // 1 year from now
    const tokensPerBond = 1000
    const bondPrice = ethers.parseUnits("950", 6);  // 950 USDC (slight discount)
    const maxBondSupply = ethers.parseUnits("1000000", 6); // 1,000,000 bonds

  // Create a tokenized bond
  async function createTokenizedBond() {
    const tx = await contract.createTokenizedBond(
        bondName,   // _name
        bondSymbol,         // _symbol
        bondId,               // _id
        faceValue,            // _faceValue
        couponRate,               // _couponRate
        couponFrequency,               // _couponFrequency
        maturityDate,  // _maturityDate (1 year from now)
        signer.address,  // _issuer
      "0x4b84D11FAD4dD6fb6277E055D0892023456eeCFc", // _stablecoinAddress
      tokensPerBond,             // _tokensPerBond
      bondPrice,            // _bondPrice
      maxBondSupply            // _maxBondSupply
    );
    console.log("Bond creation tx hash:", tx.hash);
    await tx.wait();
    console.log("Bond created successfully.");
  }

  // Get active bond details
  async function getActiveBondDetails(index) {
    const result = await contract.getActiveBondDetails(index);
    console.log("Active Bond Details:", result);
  }

  // Run the functions for demonstration
  await createTokenizedBond();
  await getActiveBondDetails(bondCount);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

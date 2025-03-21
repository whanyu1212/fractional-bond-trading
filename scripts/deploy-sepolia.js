async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Constructor arguments
    const tokenName = "Mock USD Coin";
    const tokenSymbol = "mUSDC";
    // Deploy MockStablecoin
    const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
    const mockStablecoin = await MockStablecoin.deploy(tokenName,tokenSymbol);
    await mockStablecoin.waitForDeployment();
    console.log("mockStablecoin deployed to:", await mockStablecoin.getAddress());

    // Deploy BondFactory
    const BondFactory = await ethers.getContractFactory("BondFactory");
    const bondFactory = await BondFactory.deploy();
    await bondFactory.waitForDeployment();
    console.log("BondFactory deployed to:", await bondFactory.getAddress());
}

main().catch((error) => {
    console.error("Deployment failed:", error);
    process.exitCode = 1;
  });

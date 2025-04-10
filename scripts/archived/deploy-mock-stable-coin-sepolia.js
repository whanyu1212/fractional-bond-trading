async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Constructor arguments
    const tokenName = "BondChain Coin";
    const tokenSymbol = "BCC";
    // Deploy MockStablecoin
    const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
    const mockStablecoin = await MockStablecoin.deploy(tokenName,tokenSymbol);
    await mockStablecoin.waitForDeployment();
    console.log("mockStablecoin deployed to:", await mockStablecoin.getAddress());
}

main().catch((error) => {
    console.error("Deployment failed:", error);
    process.exitCode = 1;
  });

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

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

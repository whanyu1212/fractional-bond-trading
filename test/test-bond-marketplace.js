const {
    loadFixture,
    time
  } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("BondMarketPlace", function () {
    async function setUp(){
    /**
     * The setUp function is used to deploy the contracts and set up the environment for testing.
     * It's pretty much the same as the one in test-tokenized-bond.js, but with the addition of the BondMarketplace contract.
     */

        const currentTimestamp = await time.latest();
            
            // Synthetic values for the bondInfo struct
            const bondName = "Test Bond";
            const bondSymbol = "TBOND";
            const bondId = 1;
            const faceValue = ethers.parseUnits("1000", 6);  // 1000 USDC (6 decimals)
            const couponRate = 500;  // 5.00% (in basis points)
            const couponFrequency = 2;  // Semi-annual payments
            const maturityDate = currentTimestamp + (365 * 24 * 60 * 60);  // 1 year from now
            const tokensPerBond = ethers.parseUnits("1000", 18);  // 1000 tokens per bond
            const bondPrice = ethers.parseUnits("950", 6);  // 950 USDC (slight discount)
            const maxBondSupply = ethers.parseUnits("1000000", 6); // 1,000,000 bonds
        
            // Regular javascript number, might need conversion to BigInt
            const bondAmount = 10; 
        
            // Get signer for issuer address
            const [deployer, buyer] = await ethers.getSigners();
            const issuerAddress = await deployer.getAddress();
            const buyerAddress = await buyer.getAddress();
        
            // Deploy MockStablecoin first (The deployer has ownership)
            const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
            const mockStablecoin = await MockStablecoin.deploy("Mock USDC", "USDC");
            await mockStablecoin.waitForDeployment();
            
            const mockStablecoinAddress = await mockStablecoin.getAddress();
            console.log("MockStablecoin deployed to:", mockStablecoinAddress);
        
            // Then deploy TokenizedBond (The deployer has ownership)
            const TokenizedBond = await ethers.getContractFactory("TokenizedBond");
            const tokenizedBond = await TokenizedBond.deploy(
                bondName,              // _name (1st)
                bondSymbol,            // _symbol (2nd)
                bondId,                // _id (3rd)
                faceValue,             // _faceValue (4th)
                couponRate,            // _couponRate (5th)
                couponFrequency,       // _couponFrequency (6th)
                maturityDate,          // _maturityDate (7th)
                issuerAddress,         // _issuer (8th) - this was missing!
                mockStablecoinAddress, // _stablecoinAddress (9th)
                tokensPerBond,         // _tokensPerBond (10th)
                bondPrice,             // _bondPrice (11th)
                maxBondSupply          // _maxBondSupply (12th)
            );
        
            await tokenizedBond.waitForDeployment();
            const tokenizedBondAddress = await tokenizedBond.getAddress();
            console.log("TBOND deployed to:", tokenizedBondAddress);
        
            // public structs in TokenizedBond contract
            const bondInfo = await tokenizedBond.bondInfo();
            const fractionInfo = await tokenizedBond.fractionInfo();
        
        
            // Deploy BondMarketplace (The deployer has ownership)
            const BondMarketplace = await ethers.getContractFactory("BondMarketPlace");
            const bondMarketplace = await BondMarketplace.deploy();
            await bondMarketplace.waitForDeployment();
            const bondMarketplaceAddress = await bondMarketplace.getAddress();
        
            // Calculate required reserves for future payments
        
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
        
            // Mint stablecoins with sufficient reserves
            const userMintAmount = ethers.parseUnits("10000", 6); // For user operations
            
            // Mint to deployer/user
            await mockStablecoin.mint(deployer.address, userMintAmount);
            // Mint sufficient reserves to contract
            await mockStablecoin.mint(tokenizedBondAddress, reserveAmount);

            await tokenizedBond.mintBond(bondMarketplaceAddress, bondAmount);
    
            // Approve marketplace to handle bonds
            await tokenizedBond.approve(bondMarketplaceAddress, BigInt(bondAmount) * BigInt(tokensPerBond));

            return {bondInfo, fractionInfo, BondMarketplace, tokenizedBond, mockStablecoin, deployer, buyer, issuerAddress, buyerAddress, tokenizedBondAddress, mockStablecoinAddress, bondMarketplace, bondAmount};
    }
    it("should allow minting of bond to the marketplace", async function () {
        const {fractionInfo, tokenizedBond, bondMarketplace, bondAmount} = await setUp();
        
        const bondMarketplaceAddress = await bondMarketplace.getAddress();
        
        // Check the balance of the marketplace address
        // The balance is in bond tokens which is equal to the bondAmount * tokensPerBond
        const bondBalance = await tokenizedBond.balanceOf(bondMarketplaceAddress);
        
        // Get tokensPerBond from fractionInfo
        const tokensPerBond = fractionInfo.tokensPerBond;
        
        expect(bondBalance).to.equal(BigInt(bondAmount) * BigInt(tokensPerBond));
    });

    it("should allow the listing of the bond in the marketplace", async function () {
        const {tokenizedBond, bondMarketplace, bondInfo, fractionInfo, tokenizedBondAddress, issuerAddress} = await setUp();
        
        // List the bond in the marketplace
        await bondMarketplace.listBond(
            bondInfo.bondId,           
            tokenizedBondAddress,      
            fractionInfo.bondPrice    
        );
        
        const bondListing = await bondMarketplace.bondListings(bondInfo.bondId);
        
        // Check the bond listing values
        expect(bondListing.isListed).to.equal(true);
        expect(bondListing.bondContract).to.equal(tokenizedBondAddress);
        expect(bondListing.listingPrice).to.equal(fractionInfo.bondPrice);
        
        expect(bondListing.issuer).to.equal(issuerAddress);
        expect(bondListing.matured).to.equal(false);
    });

    it("should allow modification of the bond listing in the marketplace", async function () {
        const {tokenizedBond, bondMarketplace, bondInfo, fractionInfo, tokenizedBondAddress, issuerAddress} = await setUp();
        
        // List the bond in the marketplace
        await bondMarketplace.listBond(
            bondInfo.bondId,           
            tokenizedBondAddress,      
            fractionInfo.bondPrice    
        );
        
        // Modify the bond listing in the marketplace
        const newPrice = ethers.parseUnits("900", 6);
        await bondMarketplace.modifyListing(
            bondInfo.bondId,           
            newPrice
        );
        
        const bondListing = await bondMarketplace.bondListings(bondInfo.bondId);
        
        // Check the bond listing values
        expect(bondListing.isListed).to.equal(true);
        expect(bondListing.bondContract).to.equal(tokenizedBondAddress);
        expect(bondListing.listingPrice).to.equal(newPrice);
        
        expect(bondListing.issuer).to.equal(issuerAddress);
        expect(bondListing.matured).to.equal(false);
    }
    );
    
    it("should allow the delisting of the bond in the marketplace", async function () {
        const {bondMarketplace, bondInfo, fractionInfo, tokenizedBondAddress, issuerAddress} = await setUp();
        
        // List the bond in the marketplace
        await bondMarketplace.listBond(
            bondInfo.bondId,           
            tokenizedBondAddress,      
            fractionInfo.bondPrice    
        );
        
        // Delist the bond in the marketplace
        await bondMarketplace.delistBond(bondInfo.bondId);
        
        const bondListing = await bondMarketplace.bondListings(bondInfo.bondId);
        
        // Check the bond listing values
        expect(bondListing.isListed).to.equal(false);
        expect(bondListing.bondContract).to.equal(tokenizedBondAddress);
        expect(bondListing.listingPrice).to.equal(0);
        
        expect(bondListing.issuer).to.equal(issuerAddress);
        expect(bondListing.matured).to.equal(false);
    }
    );

    it("should allow the purchase of the bond in the marketplace", async function () {
        const {tokenizedBond, bondMarketplace, bondInfo, fractionInfo, tokenizedBondAddress, mockStablecoin, deployer, buyer, buyerAddress} = await setUp();
        
        // List the bond in the marketplace
        await bondMarketplace.listBond(
            bondInfo.bondId,           
            tokenizedBondAddress,      
            fractionInfo.bondPrice    
        );

        const purchaseAmount = 2;
        const totalPrice = fractionInfo.bondPrice * BigInt(purchaseAmount);
        // mint stablecoin to the buyer for paying
        await mockStablecoin.mint(buyerAddress, totalPrice);
        //whitelisting and kyc
        await tokenizedBond.connect(deployer).addToWhitelist([buyerAddress]);
        await tokenizedBond.connect(deployer).setKycStatus([buyerAddress], true);
        /**
         * Make buyer the transaction signer/sender
         * Approve the tokenizedBond contract to spend the total price of the bond 
         * of the buyer's stablecoin.
         * 
         * "The buyer authorizes the tokenizedBond contract to spend up to the totalPrice of
         * the buyer's stablecoin."
         */

        const initialStablecoinBalance = await mockStablecoin.balanceOf(buyer.getAddress());
        const initialBondBalance = await tokenizedBond.balanceOf(buyer.getAddress());
        await mockStablecoin.connect(buyer).approve(tokenizedBondAddress, totalPrice);
        const allowance = await mockStablecoin.allowance(buyer.getAddress(), tokenizedBondAddress);

        await bondMarketplace.connect(buyer).purchaseBond(bondInfo.bondId, purchaseAmount);
        const finalStablecoinBalance = await mockStablecoin.balanceOf(buyer.getAddress());
        const finalBondBalance = await tokenizedBond.balanceOf(buyer.getAddress());

        const expectedStablecoinDecrease = totalPrice;
        const expectedBondIncrease = BigInt(purchaseAmount) * fractionInfo.tokensPerBond;
        
        // Verify stablecoin was spent
        expect(initialStablecoinBalance - finalStablecoinBalance).to.equal(expectedStablecoinDecrease);
        
        // Verify bond tokens were received
        expect(finalBondBalance - initialBondBalance).to.equal(expectedBondIncrease);

    }
        
    );

    it("should allow the claiming of the coupon payment in the marketplace", async function () {
        const {tokenizedBond, bondMarketplace, bondInfo, fractionInfo, tokenizedBondAddress, mockStablecoin, deployer, buyer, buyerAddress} = await setUp();
        
        // List the bond in the marketplace
        await bondMarketplace.listBond(
            bondInfo.bondId,           
            tokenizedBondAddress,      
            fractionInfo.bondPrice    
        );
    
    
        const purchaseAmount = BigInt(2); // Convert to BigInt
        const totalPrice = fractionInfo.bondPrice * purchaseAmount;
        
        // Mint stablecoin to buyer
        await mockStablecoin.mint(buyerAddress, totalPrice);
        
        // Setup KYC
        await tokenizedBond.connect(deployer).addToWhitelist([buyerAddress]);
        await tokenizedBond.connect(deployer).setKycStatus([buyerAddress], true);
    
        // Approve and purchase
        await mockStablecoin.connect(buyer).approve(tokenizedBondAddress, totalPrice);
        await bondMarketplace.connect(buyer).purchaseBond(bondInfo.bondId, purchaseAmount);
    
        // Get initial balance as BigInt
        const initialStablecoinBalance = BigInt(await mockStablecoin.balanceOf(buyerAddress));
    
        // Increase time to next coupon period
        const secondsToIncrease = Math.floor(185 * 24 * 60 * 60 / Number(bondInfo.couponFrequency)) + 1;
        await time.increase(secondsToIncrease);
        
        // Claim coupon
        await bondMarketplace.connect(buyer).claimCoupon(bondInfo.bondId);
    
        // Get final balances as BigInt
        const finalStablecoinBalance = BigInt(await mockStablecoin.balanceOf(buyer.getAddress()));
        const finalBondBalance = BigInt(await tokenizedBond.balanceOf(buyer.getAddress()));
        
        // Calculate expected coupon payment using all BigInt operations
        const expectedCouponPayment = (
            finalBondBalance * 
            BigInt(bondInfo.faceValue) * 
            BigInt(bondInfo.couponRate)
        ) / (
            BigInt(10000) * 
            BigInt(fractionInfo.tokensPerBond) * 
            BigInt(bondInfo.couponFrequency)
        );

        expect(finalStablecoinBalance).to.equal(
            initialStablecoinBalance + expectedCouponPayment
        );
    });
    it("should allow the redemption of the bond in the marketplace", async function () {
        const {tokenizedBond, bondMarketplace, bondInfo, fractionInfo, tokenizedBondAddress, mockStablecoin, deployer, buyer, buyerAddress} = await setUp();
        
        // List the bond in the marketplace
        await bondMarketplace.listBond(
            bondInfo.bondId,           
            tokenizedBondAddress,      
            fractionInfo.bondPrice    
        );
    
        const purchaseAmount = BigInt(2); 
        const totalPrice = fractionInfo.bondPrice * purchaseAmount;
        
        // Mint stablecoin to buyer
        await mockStablecoin.mint(buyerAddress, totalPrice);
        
        // Setup KYC
        await tokenizedBond.connect(deployer).addToWhitelist([buyerAddress]);
        await tokenizedBond.connect(deployer).setKycStatus([buyerAddress], true);
    
        // Approve and purchase
        await mockStablecoin.connect(buyer).approve(tokenizedBondAddress, totalPrice);
        await bondMarketplace.connect(buyer).purchaseBond(bondInfo.bondId, purchaseAmount);
    
        // Get initial balance as BigInt
        const initialStablecoinBalance = BigInt(await mockStablecoin.balanceOf(buyerAddress));
        
        // Capture bond balance BEFORE redemption
        const bondBalanceBeforeRedemption = BigInt(await tokenizedBond.balanceOf(buyerAddress));
    
        // Increase time to maturity
        await time.increaseTo(bondInfo.maturityDate);
        
        await bondMarketplace.updateBondMaturity(bondInfo.bondId, true);

        // Redeem bond
        await bondMarketplace.connect(buyer).redeemBond(bondInfo.bondId);
    
        // Get final stablecoin balance
        const finalStablecoinBalance = BigInt(await mockStablecoin.balanceOf(buyerAddress));

    
        // Calculate expected principal payment accounting for fractionalization
        const expectedPrincipalPayment = (
            bondBalanceBeforeRedemption * 
            BigInt(bondInfo.faceValue)
        ) / BigInt(fractionInfo.tokensPerBond);
    
        // Verify final balance matches initial + coupon + principal
        // Omitting coupon payment as it was already verified in the previous test
        expect(finalStablecoinBalance).to.equal(
            initialStablecoinBalance + expectedPrincipalPayment
        );
    
        // Verify bonds were burned
        expect(await tokenizedBond.balanceOf(buyerAddress)).to.equal(BigInt(0));
    });

});
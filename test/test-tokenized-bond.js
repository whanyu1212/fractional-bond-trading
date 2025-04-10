const {
    loadFixture,
    time
  } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("TokenizedBond", function () {
    async function setup() {
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
        
            // Get signer for issuer address
            const [deployer, user1, user2, user3, user4] = await ethers.getSigners();
            const issuerAddress = await deployer.getAddress();
        
            // Deploy MockStablecoin
            const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
            const mockStablecoin = await MockStablecoin.deploy("Mock USDC", "USDC");
            await mockStablecoin.waitForDeployment();
            const mockStablecoinAddress = await mockStablecoin.getAddress();

            // Deploy TokenizedBond
            const TokenizedBond = await ethers.getContractFactory("TokenizedBond");
            const tokenizedBond = await TokenizedBond.deploy(
                bondName,
                bondSymbol,
                bondId,
                faceValue,
                couponRate,
                couponFrequency,
                maturityDate,
                issuerAddress,
                mockStablecoinAddress,
                tokensPerBond,
                bondPrice,
                maxBondSupply
            );
            await tokenizedBond.waitForDeployment();
            const tokenizedBondAddress = await tokenizedBond.getAddress();

            // Pre-mint stablecoins to users and contract
            const mintAmount = ethers.parseUnits("10000", 6);
            const contractMintAmount = ethers.parseUnits("2000", 6);
            await mockStablecoin.mint(user1.address, mintAmount);
            await mockStablecoin.mint(user2.address, mintAmount);
            await mockStablecoin.mint(issuerAddress, mintAmount);
            await mockStablecoin.mint(tokenizedBondAddress, contractMintAmount);

            // Whitelist and KYC approve users by default
            await tokenizedBond.addToWhitelist([user1.address, user2.address, user3.address, user4.address]);
            await tokenizedBond.setKycStatus([user1.address, user2.address, user3.address, user4.address], true);

            // Get bond and fraction info for easy access in tests
            const bondInfo = await tokenizedBond.getBondInfo();
            const fractionInfo = await tokenizedBond.fractionInfo();

            return {
                bondInfo,
                fractionInfo,
                issuerAddress,
                user1,
                user2,
                user3,
                user4,
                mockStablecoin,
                tokenizedBond,
                tokenizedBondAddress,
                mockStablecoinAddress,
                mintAmount,
                contractMintAmount
            };

    }
    it("Both token and stablecoin contract should deploy", async function () {
        const {tokenizedBondAddress, mockStablecoinAddress} = await setup();
        expect(tokenizedBondAddress).to.be.properAddress;
        expect(mockStablecoinAddress).to.be.properAddress;
    });
    it("should have the correct bond info", async function () {
        const { tokenizedBond, issuerAddress } = await setup();
        const bondInfo = await tokenizedBond.getBondInfo();
        
        expect(bondInfo.name).to.equal("Test Bond");
        expect(bondInfo.symbol).to.equal("TBOND");
        expect(bondInfo.bondId).to.equal(1);
        expect(bondInfo.faceValue).to.equal(ethers.parseUnits("1000", 6));
        expect(bondInfo.couponRate).to.equal(500);
        expect(bondInfo.couponFrequency).to.equal(2);
        expect(bondInfo.issuer).to.equal(issuerAddress);
        expect(bondInfo.maxBondSupply).to.equal(ethers.parseUnits("1000000", 6));
        
        // Verify the bond has not matured yet
        expect(bondInfo.maturityDate).to.be.greaterThan(await time.latest());
    });
    it("should allow whitelist and unwhitelist", async function () {
        const { tokenizedBond, user1, user2 } = await setup();
        await tokenizedBond.addToWhitelist([user1.address, user2.address]);
        expect(await tokenizedBond.whitelist(user1.address)).to.be.true;
        expect(await tokenizedBond.whitelist(user2.address)).to.be.true;
        await tokenizedBond.removeFromWhitelist([user1.address, user2.address]);
        expect(await tokenizedBond.whitelist(user1.address)).to.be.false;
        expect(await tokenizedBond.whitelist(user2.address)).to.be.false;
    }
    );
    it("should allow kyced and unkyced", async function () {
        const { tokenizedBond, user1, user2 } = await setup();
        await tokenizedBond.setKycStatus([user1.address, user2.address], true);
        expect(await tokenizedBond.kycApproved(user1.address)).to.be.true;
        expect(await tokenizedBond.kycApproved(user2.address)).to.be.true;
        await tokenizedBond.setKycStatus([user1.address, user2.address], false);
        expect(await tokenizedBond.kycApproved(user1.address)).to.be.false;
        expect(await tokenizedBond.kycApproved(user2.address)).to.be.false;
    }
    );
    it("should allow bond purchase", async function () {
        const { 
            tokenizedBond, 
            tokenizedBondAddress, 
            user1, 
            mockStablecoin, 
            fractionInfo 
        } = await setup();
        
        await mockStablecoin.connect(user1).approve(tokenizedBondAddress, fractionInfo.bondPrice);
        await tokenizedBond.connect(user1).purchaseBondFor(user1.address, 1);
        
        expect(await tokenizedBond.balanceOf(user1.address)).to.equal(fractionInfo.tokensPerBond);
    });
    it("should allow coupon payment and bond redemption", async function () {
        const { tokenizedBond, tokenizedBondAddress, user1, mockStablecoin, issuerAddress } = await setup();
        const mintAmount = ethers.parseUnits("10000", 6);
        const contractMintAmount = ethers.parseUnits("2000", 6);
        
        // Setup initial balances and approvals
        await mockStablecoin.mint(user1.address, mintAmount);
        await mockStablecoin.mint(issuerAddress, mintAmount);
        await mockStablecoin.mint(tokenizedBondAddress, contractMintAmount);
        await tokenizedBond.addToWhitelist([user1.address]);
        await tokenizedBond.setKycStatus([user1.address], true);
        
        // Get both bond info and fraction info
        const bondInfo = await tokenizedBond.getBondInfo();
        const fractionInfo = await tokenizedBond.fractionInfo();
        
        // Purchase bond
        await mockStablecoin.connect(user1).approve(tokenizedBondAddress, fractionInfo.bondPrice);
        await tokenizedBond.connect(user1).purchaseBondFor(user1.address, 1);
        
        // Verify initial token balance
        const expectedBalance = fractionInfo.tokensPerBond;
        expect(await tokenizedBond.balanceOf(user1.address)).to.equal(expectedBalance);
    
        // Calculate expected coupon amount
        const couponAmount = (BigInt(bondInfo.faceValue) * BigInt(bondInfo.couponRate)) / BigInt(10000) / BigInt(bondInfo.couponFrequency);
        
        await time.increase(185 * 24 * 60 * 60); // Advance time to first coupon payment
        const initialStablecoinBalance = BigInt(await mockStablecoin.balanceOf(user1.address));
        await tokenizedBond.claimCouponFor(user1.address);
        
        // Verify coupon payment
        const stablecoinBalanceAfterCoupon = BigInt(await mockStablecoin.balanceOf(user1.address));
        expect(stablecoinBalanceAfterCoupon).to.equal(initialStablecoinBalance + couponAmount);
        
        // Advance time past maturity
        await time.increase(366 * 24 * 60 * 60);
    
        // Get balance before redemption
        const balanceBeforeRedemption = BigInt(await mockStablecoin.balanceOf(user1.address));
    
        // Redeem bond
        await tokenizedBond.redeemFor(user1.address);
        
        // Verify final balances
        expect(await tokenizedBond.balanceOf(user1.address)).to.equal(0);
        const finalBalance = BigInt(await mockStablecoin.balanceOf(user1.address));
        expect(finalBalance).to.equal(balanceBeforeRedemption + BigInt(bondInfo.faceValue));
    });
    it("should allow bond transfer", async function () {
        const { 
            tokenizedBond, 
            tokenizedBondAddress,
            user1, 
            user2, 
            mockStablecoin, 
            fractionInfo 
        } = await setup();
    
        await mockStablecoin.connect(user1).approve(tokenizedBondAddress, fractionInfo.bondPrice);
        await tokenizedBond.connect(user1).purchaseBondFor(user1.address, 1);
        
        expect(await tokenizedBond.balanceOf(user1.address)).to.equal(fractionInfo.tokensPerBond);
        
        await tokenizedBond.connect(user1).transfer(user2.address, fractionInfo.tokensPerBond);
        expect(await tokenizedBond.balanceOf(user1.address)).to.equal(0);
        expect(await tokenizedBond.balanceOf(user2.address)).to.equal(fractionInfo.tokensPerBond);
        
        await tokenizedBond.connect(user2).transfer(user1.address, fractionInfo.tokensPerBond);
        expect(await tokenizedBond.balanceOf(user2.address)).to.equal(0);
        expect(await tokenizedBond.balanceOf(user1.address)).to.equal(fractionInfo.tokensPerBond);
    });
});


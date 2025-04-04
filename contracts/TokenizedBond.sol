// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

//Import its own interface
import "./ITokenizedBond.sol";
// Using ERC20 from OpenZeppelin as the base
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// Using SafeERC20 from OpenZeppelin to avoid reentrancy attacks
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// Enforce access rights via Ownable from OpenZeppelin
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TokenizedBond
 * @dev ERC20 token representing a bond with a fixed coupon rate and maturity date
 * @author whanyu1212
 * @notice This is a simple implementation which may not be production-ready
 */
contract TokenizedBond is ERC20, Ownable {
    // has additional safety features implemented
    // using means that the functions from SafeERC20 can be called directly
    using SafeERC20 for IERC20;

    //-------------------- Compliance and Security ------------------------------------//
    struct DocumentInfo {
        string documentURI; // URI to legal document
        bytes32 documentHash; // Hash of the document
    }

    //-------------------- Bond Details ------------------------------------//

    struct BondInfo {
        string name; // Name of the bond
        string symbol; // Symbol of the bond
        uint256 bondId; // Unique identifier or name for the bond
        address issuer; // Bond issuer's address
        uint256 maxBondSupply; // Maximum number of whole bonds that can be minted and issued conceptually
        uint256 maturityDate; // UNIX timestamp for maturity, after which bond can be redeemed
        uint256 faceValue; // Total principal amount of the bond
        uint256 couponRate; // Annual coupon rate (e.g., in basis points)
        uint256 couponFrequency; // Number of coupon payments per year, e.g., 2 for semi-annual
        uint256 issueDate; // Date the bond was issued
        uint256 lastCouponPaymentDate; // Date of the last coupon payment
        uint256 totalCouponsPaid; // Total number of coupons paid, for tracking
        uint256 totalBondsMinted; // Total number of bonds minted
    }

    //-------------------- Fractionalization ------------------------------------//

    struct FractionalizationInfo {
        uint256 tokensPerBond; // Total ERC20 tokens representing one bond
        uint256 tokenPrice; // Price of one token in stablecoin
        uint256 totalRaised; // Total amount raised from bond sales
        uint256 maxOfferingSize; // Maximum amount of stablecoin to raise
    }

    BondInfo public bondInfo;
    FractionalizationInfo public fractionInfo;
    DocumentInfo public documentInfo;

    // Track last coupon claimed by each holder
    mapping(address => uint256) public lastClaimedCoupon;

    // e.g., USDC, USDT, DAI etc.
    IERC20 public stablecoin;

    // Whitelist of addresses allowed to hold tokens
    mapping(address => bool) public whitelist;

    // Track if an address has passed KYC
    mapping(address => bool) public kycApproved;

    //-------------------- Events ------------------------------------//
    event BondModified(
        uint256 couponRate,
        uint256 maturityDate,
        uint256 maxBondSupply,
        uint256 tokenPrice
    );
    event BondMinted(
        address indexed to,
        uint256 bondAmount,
        uint256 tokenAmount
    );
    event BondPurchased(address indexed buyer, uint256 bondAmount);
    event CouponPaid(address indexed claimer, uint256 couponAmount);
    event BondRedeemed(address indexed redeemer, uint256 redemptionAmount);

    //-------------------- Unused events --------------------//
    event DocumentURIUpdated(string documentURI);
    event DocumentHashUpdated(bytes32 documentHash);

    event AddedToWhitelist(address indexed account);
    event RemovedFromWhitelist(address indexed account);
    event KycStatusChanged(address indexed account, bool approved);
    //-------------------------------------------------------//

    event BondTraded(
        address indexed from,
        address indexed to,
        uint256 tokenAmount,
        uint256 stablecoinAmount
    );
    event BondGifted(
        address indexed from,
        address indexed to,
        uint256 tokenAmount
    );

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _id,
        uint256 _faceValue,
        uint256 _couponRate,
        uint256 _couponFrequency,
        uint256 _maturityDate,
        address _issuer,
        address _stablecoinAddress,
        uint256 _tokensPerBond,
        uint256 _tokenPrice,
        uint256 _maxBondSupply,
        uint256 _maxOfferingSize
    ) ERC20(_name, _symbol) Ownable(msg.sender) {
        bondInfo = BondInfo({
            name: _name,
            symbol: _symbol,
            bondId: _id,
            issuer: _issuer,
            maxBondSupply: _maxBondSupply,
            maturityDate: _maturityDate,
            faceValue: _faceValue,
            couponRate: _couponRate,
            couponFrequency: _couponFrequency,
            issueDate: block.timestamp,
            lastCouponPaymentDate: block.timestamp,
            totalCouponsPaid: 0,
            totalBondsMinted: 0
        });

        fractionInfo = FractionalizationInfo({
            tokensPerBond: _tokensPerBond,
            tokenPrice: _tokenPrice,
            totalRaised: 0,
            maxOfferingSize: _maxOfferingSize // Max stablecoin value to raise
        });

        stablecoin = IERC20(_stablecoinAddress);
    }

    //-------------------- View/Getter functions --------------------//

    /**
     * @notice Get the bond price in stablecoin
     * @return The price of one bond (unit token price x tokens per bond) in stablecoin
     */
    function getBondPrice() public view returns (uint256) {
        return fractionInfo.tokenPrice * fractionInfo.tokensPerBond;
    }

    /**
     * @notice Get the Bond ID
     * @return The unique identifier for the bond
     */
    function getBondId() public view returns (uint256) {
        return bondInfo.bondId;
    }

    /**
     * @notice Get the coupon frequency of the bond
     * @return The coupon frequency in number of payments per year
     */
    function getCouponFrequency() public view returns (uint256) {
        return bondInfo.couponFrequency;
    }

    /**
     * @notice Get the stablecoin address used for this bond
     * @return The address of the stablecoin contract
     */
    function getStablecoinAddress() public view returns (address) {
        return address(stablecoin);
    }

    function getTokensPerBond() external view returns (uint256) {
        return fractionInfo.tokensPerBond;
    }

    //-------------------- Owner functions --------------------//

    /**
     * @notice Modify a subset of bond parameters (only callable by owner/issuer), must be bigger than 0
     * @param _couponRate New coupon rate in basis points
     * @param _maturityDate New maturity date
     * @param _maxBondSupply New maximum bond supply
     * @param _tokenPrice New bond price
     * @param _maxOfferingSize New maximum offering size
     */
    function modifyBond(
        uint256 _couponRate,
        uint256 _maturityDate,
        uint256 _maxBondSupply,
        uint256 _tokenPrice,
        uint256 _maxOfferingSize
    ) external onlyOwner {
        if (_couponRate > 0) {
            bondInfo.couponRate = _couponRate;
        }

        if (_maturityDate > block.timestamp) {
            bondInfo.maturityDate = _maturityDate;
        }

        if (_maxBondSupply > 0) {
            require(
                _maxBondSupply >= bondInfo.totalBondsMinted,
                "New supply must exceed minted bonds"
            );
            bondInfo.maxBondSupply = _maxBondSupply;
        }

        if (_tokenPrice > 0) {
            fractionInfo.tokenPrice = _tokenPrice;
        }

        if (_maxOfferingSize > 0) {
            fractionInfo.maxOfferingSize = _maxOfferingSize;
        }

        emit BondModified(
            bondInfo.couponRate,
            bondInfo.maturityDate,
            bondInfo.maxBondSupply,
            fractionInfo.tokenPrice
        );
    }

    /**
     * @notice Mint new bond tokens corresponding to a number of whole bonds. Only owner.
     * @dev Typically used by the issuer to create the initial supply or add more supply if needed,up to the maxBondSupply.
     * @param to The address to which the new bond tokens will be minted.
     * @param bondAmount The number of *whole bonds* worth of tokens to mint.
     */
    function mintBond(address to, uint256 bondAmount) external onlyOwner {
        require(to != address(0), "Mint to the zero address");
        require(bondAmount > 0, "Mint amount must be > 0");
        require(
            bondInfo.totalBondsMinted + bondAmount <= bondInfo.maxBondSupply,
            "Exceeds maximum bond supply (number)" // Check against the count of whole bonds
        );
        require(block.timestamp < bondInfo.maturityDate, "Bond has matured");

        // Calculate the number of fractional tokens to mint
        uint256 tokenAmount = bondAmount * fractionInfo.tokensPerBond;
        // Ensure no overflow in token amount calculation
        if (bondAmount > 0) {
            require(
                tokenAmount / bondAmount == fractionInfo.tokensPerBond,
                "Mint: Token amount calculation overflow"
            );
        }

        // Update the count of total whole bonds conceptually minted
        bondInfo.totalBondsMinted += bondAmount;

        // Mint the corresponding fractional tokens to the recipient
        _mint(to, tokenAmount);

        // Initialize the last claimed coupon timestamp for the new holder if they are receiving tokens for the first time.
        // This prevents them from claiming coupons for periods before they held the tokens.
        if (lastClaimedCoupon[to] == 0) {
            // Set to current time; they become eligible to claim in the *next* full period.
            lastClaimedCoupon[to] = block.timestamp;
        }

        // Emit an event logging the minting action
        emit BondMinted(to, bondAmount, tokenAmount);
    }

    //-------------------- Purchase functions --------------------//
    /**
     * @notice Purchase whole bonds for a specified buyer by transferring stablecoin.
     * @dev Mints new fractional tokens to the buyer based on the number of whole bonds purchased.
     *      Requires prior stablecoin approval from the buyer to this contract.
     *      Checks against the maximum offering size (total stablecoin value to raise).
     * @param buyer The address that will receive the bond tokens and pay for them.
     * @param bondAmount The number of *whole* bonds to purchase.
     */
    function purchaseBondFor(address buyer, uint256 bondAmount) external {
        require(
            buyer != address(0),
            "Bond: Purchase cannot be for zero address"
        );
        require(bondAmount > 0, "Bond: Cannot purchase zero bonds");
        require(
            fractionInfo.tokenPrice > 0, // Price per fractional token
            "Bond: Token price must be set to purchase"
        );
        require(
            fractionInfo.tokensPerBond > 0, // Need this for calculation
            "Bond: Tokens per bond must be set"
        );
        require(
            block.timestamp < bondInfo.maturityDate,
            "Bond: Sale period ended (matured)"
        );

        // --- Calculate Fractional Token Amount ---
        uint256 fractionalTokenAmount = bondAmount * fractionInfo.tokensPerBond;
        // Check for overflow in fractional token calculation
        if (bondAmount > 0) {
            // Already checked bondAmount > 0, but good practice
            require(
                fractionalTokenAmount / bondAmount ==
                    fractionInfo.tokensPerBond,
                "Bond: Fractional token amount overflow"
            );
        }
        // Ensure fractional amount is also > 0 (implied by bondAmount > 0 and tokensPerBond > 0)

        // --- Calculate Total Stablecoin Cost ---
        // Cost = (Fractional Tokens) * (Price per Fractional Token)
        uint256 totalPrice = fractionalTokenAmount * fractionInfo.tokenPrice;
        // Check for overflow in price calculation
        if (fractionalTokenAmount > 0) {
            // fractionalTokenAmount is > 0 if inputs are valid
            require(
                totalPrice / fractionalTokenAmount == fractionInfo.tokenPrice,
                "Bond: Price calculation overflow"
            );
        }
        // No need to check totalPrice > 0 as inputs guarantee it

        // --- Check Offering Size Limit ---
        // Ensure the total value raised does not exceed the maximum defined for this offering.
        require(
            fractionInfo.totalRaised + totalPrice <=
                fractionInfo.maxOfferingSize,
            "Bond: Purchase exceeds maximum offering size"
        );

        // --- Check Max Supply Limit ---
        // Calculate max total tokens possible based on max *number* of bonds
        uint256 maxTotalTokens = bondInfo.maxBondSupply *
            fractionInfo.tokensPerBond;
        // Prevent overflow in maxTotalTokens calculation (redundant if constructor checks inputs)
        if (bondInfo.maxBondSupply > 0) {
            require(
                maxTotalTokens / bondInfo.maxBondSupply ==
                    fractionInfo.tokensPerBond,
                "Bond: Max token calculation overflow"
            );
        }
        // Ensure minting this amount doesn't exceed the theoretical max token count
        // Checks current ERC20 totalSupply() + the amount we *will* mint
        require(
            totalSupply() + fractionalTokenAmount <= maxTotalTokens,
            "Bond: Purchase exceeds max possible token supply"
        );

        stablecoin.safeTransferFrom(buyer, address(this), totalPrice);

        _mint(buyer, fractionalTokenAmount);

        fractionInfo.totalRaised += totalPrice;

        // Initialize the last claimed coupon timestamp for the new holder if they are new
        if (lastClaimedCoupon[buyer] == 0) {
            // Set to current time, they can claim next period if eligible
            lastClaimedCoupon[buyer] = block.timestamp;
        }

        // --- Emit Event ---
        emit BondPurchased(buyer, fractionalTokenAmount); // Emitting fractional amount makes sense here
    }

    //-------------------- Claim functions --------------------//

    /**
     * @notice Claim coupon payments on behalf of a given address.
     * @param claimer The address for which to claim coupon payments.
     */
    function claimCouponFor(address claimer) external {
        // require(whitelist[claimer], "Claimer not whitelisted");
        // require(kycApproved[claimer], "Claimer not KYC approved");
        require(balanceOf(claimer) > 0, "No bonds held");
        require(
            block.timestamp >=
                lastClaimedCoupon[claimer] +
                    (365 days / bondInfo.couponFrequency),
            "Too early"
        );

        uint256 couponAmount = (balanceOf(claimer) *
            bondInfo.faceValue *
            bondInfo.couponRate) /
            (fractionInfo.tokensPerBond * 10000 * bondInfo.couponFrequency);
        lastClaimedCoupon[claimer] = block.timestamp;
        stablecoin.safeTransfer(claimer, couponAmount);
        emit CouponPaid(claimer, couponAmount);
    }

    /**
     * @notice Claim coupon payments on behalf of multiple addresses in a single transaction
     * @param claimers Array of addresses for which to claim coupon payments
     * @return successfulClaims Array of booleans indicating which claims were successful
     * @return totalClaimed Total amount of coupons claimed across all successful claims
     */
    function batchClaimCoupons(
        address[] calldata claimers
    ) external returns (bool[] memory successfulClaims, uint256 totalClaimed) {
        require(claimers.length > 0, "Empty claimers array");

        successfulClaims = new bool[](claimers.length);
        totalClaimed = 0;

        for (uint256 i = 0; i < claimers.length; i++) {
            address claimer = claimers[i];

            // Check basic requirements
            if (balanceOf(claimer) == 0) {
                successfulClaims[i] = false;
                continue;
            }

            // Check if enough time has passed since last claim
            if (
                block.timestamp <
                lastClaimedCoupon[claimer] +
                    (365 days / bondInfo.couponFrequency)
            ) {
                successfulClaims[i] = false;
                continue;
            }

            // Calculate coupon amount
            uint256 couponAmount = (balanceOf(claimer) *
                bondInfo.faceValue *
                bondInfo.couponRate) /
                (fractionInfo.tokensPerBond * 10000 * bondInfo.couponFrequency);

            // Update state
            lastClaimedCoupon[claimer] = block.timestamp;

            // Transfer coupon
            stablecoin.safeTransfer(claimer, couponAmount);

            // Record success and update total
            successfulClaims[i] = true;
            totalClaimed += couponAmount;

            // Emit event for each successful claim
            emit CouponPaid(claimer, couponAmount);
        }

        return (successfulClaims, totalClaimed);
    }

    //-------------------- Redemption functions --------------------//

    /**
     * @notice Redeem the bond after maturity to a specified address so this function can be called by anyone
     * @param redeemer The address to which the redemption amount will be transferred
     */
    function redeemFor(address redeemer) external {
        // require(whitelist[redeemer], "Redeemer not whitelisted");
        // require(kycApproved[redeemer], "Redeemer not KYC approved");
        require(block.timestamp >= bondInfo.maturityDate, "Bond not matured");
        uint256 bondTokens = balanceOf(redeemer);
        require(bondTokens > 0, "No bonds to redeem");

        uint256 redemptionAmount = (bondTokens * bondInfo.faceValue) /
            fractionInfo.tokensPerBond;
        _burn(redeemer, bondTokens);
        stablecoin.safeTransfer(redeemer, redemptionAmount);
        emit BondRedeemed(redeemer, redemptionAmount);
    }

    /**
     * @notice Redeem bonds after maturity for multiple addresses in a single transaction
     * @param redeemers Array of addresses for which to redeem bonds
     * @return successfulRedemptions Array of booleans indicating which redemptions were successful
     * @return totalRedeemed Total amount of stablecoins redeemed across all successful redemptions
     */
    function batchRedeemBonds(
        address[] calldata redeemers
    )
        external
        returns (bool[] memory successfulRedemptions, uint256 totalRedeemed)
    {
        require(block.timestamp >= bondInfo.maturityDate, "Bond not matured");
        require(redeemers.length > 0, "Empty redeemers array");

        successfulRedemptions = new bool[](redeemers.length);
        totalRedeemed = 0;

        for (uint256 i = 0; i < redeemers.length; i++) {
            address redeemer = redeemers[i];

            // Check if the redeemer has any bonds
            uint256 bondTokens = balanceOf(redeemer);
            if (bondTokens == 0) {
                successfulRedemptions[i] = false;
                continue;
            }

            // Calculate redemption amount
            uint256 redemptionAmount = (bondTokens * bondInfo.faceValue) /
                fractionInfo.tokensPerBond;

            // Burn tokens and transfer stablecoins
            _burn(redeemer, bondTokens);
            stablecoin.safeTransfer(redeemer, redemptionAmount);

            // Record success and update total
            successfulRedemptions[i] = true;
            totalRedeemed += redemptionAmount;

            // Emit event for each successful redemption
            emit BondRedeemed(redeemer, redemptionAmount);
        }

        return (successfulRedemptions, totalRedeemed);
    }

    //-------------------- Exchange functions --------------------//

    /**
     * @notice Swap bonds between two approved holders (both parties must agree)
     * @param from Address sending the bonds
     * @param to Address receiving the bonds
     * @param tokenAmount Amount of bond tokens to swap
     * @param stablecoinAmount Amount of stablecoins to pay
     * @dev Setting stablecoinAmount to 0 allows gifting bonds without payment
     */
    function exchangeBonds(
        address from,
        address to,
        uint256 tokenAmount,
        uint256 stablecoinAmount
    ) external {
        // Verify that caller is one of the participants
        // require(
        //     msg.sender == from || msg.sender == to,
        //     "Not authorized for swap"
        // );

        // Check if both parties are whitelisted and KYC approved
        // require(
        //     whitelist[from] && whitelist[to],
        //     "Both parties must be whitelisted"
        // );
        // require(
        //     kycApproved[from] && kycApproved[to],
        //     "Both parties must be KYC approved"
        // );

        // Check if the bond has matured
        require(
            block.timestamp < bondInfo.maturityDate,
            "Bond has matured, swapping disabled"
        );

        // Verify balances
        require(balanceOf(from) >= tokenAmount, "Insufficient bond tokens");
        // Only check stablecoin balance if payment is required (not a gift)
        if (stablecoinAmount > 0) {
            require(
                stablecoin.balanceOf(to) >= stablecoinAmount,
                "Insufficient stablecoins"
            );
        }

        // Perform the swap - transfer bonds from 'from' to 'to'
        _transfer(from, to, tokenAmount);

        // Transfer stablecoins if applicable (not a gift)
        if (stablecoinAmount > 0) {
            stablecoin.safeTransferFrom(to, from, stablecoinAmount);
        }

        // Update last claimed coupon if needed
        if (lastClaimedCoupon[to] == 0) {
            lastClaimedCoupon[to] = block.timestamp;
        }

        // Emit a bond traded event if stablecoinAmount is greater than 0
        // Otherwise, emit a bond gifted event
        // This allows for both trading and gifting of bonds
        if (stablecoinAmount > 0) {
            emit BondTraded(from, to, tokenAmount, stablecoinAmount);
        } else {
            emit BondGifted(from, to, tokenAmount);
        }
    }

    //-------------------- Unused functions --------------------//

    /**
     * @notice Set the document URI for legal documentation
     * @param _documentURI The URI pointing to the legal documents
     */
    function setDocumentURI(string calldata _documentURI) external onlyOwner {
        documentInfo.documentURI = _documentURI;
        emit DocumentURIUpdated(_documentURI);
    }

    /**
     * @notice Set the document hash for legal documentation
     * @param _documentHash The hash of the legal documents
     */
    function setDocumentHash(bytes32 _documentHash) external onlyOwner {
        documentInfo.documentHash = _documentHash;
        emit DocumentHashUpdated(_documentHash);
    }

    /**
     * @notice Verify the hash of a document
     * @param documentContent The content of the document
     * @return Whether the hash of the document matches the stored hash
     */
    function verifyDocument(
        string calldata documentContent
    ) external view returns (bool) {
        bytes32 calculatedHash = keccak256(abi.encodePacked(documentContent));
        return calculatedHash == documentInfo.documentHash;
    }

    /**
     * @notice Add addresses to the transfer whitelist
     * @param accounts Array of addresses to whitelist
     */
    function addToWhitelist(address[] calldata accounts) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            whitelist[accounts[i]] = true;
            emit AddedToWhitelist(accounts[i]);
        }
    }

    /**
     * @notice Remove addresses from the transfer whitelist
     * @param accounts Array of addresses to remove from the whitelist
     */
    function removeFromWhitelist(
        address[] calldata accounts
    ) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            whitelist[accounts[i]] = false;
            emit RemovedFromWhitelist(accounts[i]);
        }
    }

    /**
     * @notice Set KYC status for accounts
     * @param accounts Array of addresses to update
     * @param approved KYC approval status
     */
    function setKycStatus(
        address[] calldata accounts,
        bool approved
    ) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            kycApproved[accounts[i]] = approved;
            emit KycStatusChanged(accounts[i], approved);
        }
    }
}

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
        uint256 maxBondSupply; // Maximum number of bonds that can be issued
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
        uint256 bondPrice; // Price of one full bond (in stablecoin units)
        uint256 totalRaised; // Total amount raised from bond sales
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
        uint256 bondPrice
    );
    event BondMinted(
        address indexed to,
        uint256 bondAmount,
        uint256 tokenAmount
    );
    event BondPurchased(address indexed buyer, uint256 bondAmount);
    event CouponPaid(address indexed claimer, uint256 couponAmount);
    event BondRedeemed(address indexed redeemer, uint256 redemptionAmount);

    event DocumentURIUpdated(string documentURI);
    event DocumentHashUpdated(bytes32 documentHash);

    event AddedToWhitelist(address indexed account);
    event RemovedFromWhitelist(address indexed account);
    event KycStatusChanged(address indexed account, bool approved);

    event BondSwapped(
        address indexed from,
        address indexed to,
        uint256 tokenAmount,
        uint256 stablecoinAmount
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
        uint256 _bondPrice,
        uint256 _maxBondSupply
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
            bondPrice: _bondPrice,
            totalRaised: 0
        });

        stablecoin = IERC20(_stablecoinAddress);
    }

    /**
     * @notice Modify a subset of bond parameters (only callable by owner/issuer), must be bigger than 0
     * @param _couponRate New coupon rate in basis points
     * @param _maturityDate New maturity date
     * @param _maxBondSupply New maximum bond supply
     * @param _bondPrice New bond price
     */
    function modifyBond(
        uint256 _couponRate,
        uint256 _maturityDate,
        uint256 _maxBondSupply,
        uint256 _bondPrice
    ) external onlyOwner {
        require(
            bondInfo.totalBondsMinted == 0, // logically, we should not be able to modify after bonds are minted
            "Cannot modify after bonds are minted"
        );

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

        if (_bondPrice > 0) {
            fractionInfo.bondPrice = _bondPrice;
        }

        emit BondModified(
            bondInfo.couponRate,
            bondInfo.maturityDate,
            bondInfo.maxBondSupply,
            fractionInfo.bondPrice
        );
    }

    /**
     * @notice Mint new bonds to the specified address (in this case, we need to supply to the market)
     * @param to The address to which the new bonds will be minted
     * @param bondAmount The number of bonds to mint
     */
    function mintBond(address to, uint256 bondAmount) external onlyOwner {
        require(to != address(0), "Invalid recipient address");
        require(bondAmount > 0, "Amount must be greater than 0");
        require(
            bondInfo.totalBondsMinted + bondAmount <= bondInfo.maxBondSupply,
            "Exceeds maximum bond supply"
        );
        require(block.timestamp < bondInfo.maturityDate, "Bond has matured");

        // Calculate total future coupon payments
        uint256 remainingCoupons = ((bondInfo.maturityDate - block.timestamp) *
            bondInfo.couponFrequency) / 365 days;
        uint256 totalCouponPayments = (bondAmount *
            bondInfo.faceValue *
            bondInfo.couponRate *
            remainingCoupons) / (10000 * bondInfo.couponFrequency);

        // Ensure contract has enough stablecoin for coupon payments and principal
        require(
            stablecoin.balanceOf(address(this)) >=
                totalCouponPayments + (bondAmount * bondInfo.faceValue),
            "Insufficient stablecoin reserve for future payments"
        );

        uint256 tokenAmount = bondAmount * fractionInfo.tokensPerBond;
        _mint(to, tokenAmount);
        bondInfo.totalBondsMinted += bondAmount;

        // Initialize the last claimed coupon timestamp for the new holder
        if (lastClaimedCoupon[to] == 0) {
            lastClaimedCoupon[to] = block.timestamp;
        }

        emit BondMinted(to, bondAmount, tokenAmount);
    }

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

    /**
     * @notice Check if a transfer is allowed
     * @param from Sender address
     * @param to Recipient address
     * @return Whether the transfer is allowed
     */
    function canTransfer(address from, address to) public view returns (bool) {
        // Allow transfers to the contract itself for redemption after maturity
        if (block.timestamp >= bondInfo.maturityDate) {
            // After maturity, only allow transfers to the contract itself (for redemption)
            return
                to == address(this) &&
                whitelist[from] &&
                whitelist[to] &&
                kycApproved[from] &&
                kycApproved[to];
        }

        // Before maturity, check regular transfer conditions
        return
            whitelist[from] &&
            whitelist[to] &&
            kycApproved[from] &&
            kycApproved[to];
    }

    /**
     * @notice Purchase of bonds in terms of tokens
     * @param buyer The address of the buyer
     * @param tokenAmount The amount of tokens to purchase
     */
    function purchaseBondFor(address buyer, uint256 tokenAmount) external {
        require(whitelist[buyer], "Buyer not whitelisted");
        require(kycApproved[buyer], "Buyer not KYC approved");
        require(
            block.timestamp < bondInfo.maturityDate,
            "Bond no longer for sale"
        );

        // Calculate price based on token amount rather than bond amount
        uint256 totalPrice = (tokenAmount * fractionInfo.bondPrice) /
            fractionInfo.tokensPerBond;

        require(
            fractionInfo.totalRaised + totalPrice <= bondInfo.maxBondSupply,
            "Exceeds maximum bond supply"
        );

        // Pull stablecoin from the buyer's account
        stablecoin.safeTransferFrom(buyer, address(this), totalPrice);
        _mint(buyer, tokenAmount);
        fractionInfo.totalRaised += totalPrice;
        emit BondPurchased(buyer, tokenAmount);
    }

    /**
     * @notice Claim coupon payments on behalf of a given address.
     * @param claimer The address for which to claim coupon payments.
     */
    function claimCouponFor(address claimer) external {
        require(whitelist[claimer], "Claimer not whitelisted");
        require(kycApproved[claimer], "Claimer not KYC approved");
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
     * @notice Redeem the bond after maturity to a specified address so this function can be called by anyone
     * @param redeemer The address to which the redemption amount will be transferred
     */
    function redeemFor(address redeemer) external {
        require(whitelist[redeemer], "Redeemer not whitelisted");
        require(kycApproved[redeemer], "Redeemer not KYC approved");
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
     * @notice Swap bonds between two approved holders (both parties must agree)
     * @param from Address sending the bonds
     * @param to Address receiving the bonds
     * @param tokenAmount Amount of bond tokens to swap
     * @param stablecoinAmount Amount of stablecoins to pay
     * @dev Requires approval from both parties - either can initiate
     */
    function swapBonds(
        address from,
        address to,
        uint256 tokenAmount,
        uint256 stablecoinAmount
    ) external {
        // Verify that caller is one of the participants
        require(
            msg.sender == from || msg.sender == to,
            "Not authorized for swap"
        );

        // Check if both parties are whitelisted and KYC approved
        require(
            whitelist[from] && whitelist[to],
            "Both parties must be whitelisted"
        );
        require(
            kycApproved[from] && kycApproved[to],
            "Both parties must be KYC approved"
        );

        // Check if the bond has matured
        require(
            block.timestamp < bondInfo.maturityDate,
            "Bond has matured, swapping disabled"
        );

        // Verify balances
        require(balanceOf(from) >= tokenAmount, "Insufficient bond tokens");
        require(
            stablecoin.balanceOf(to) >= stablecoinAmount,
            "Insufficient stablecoins"
        );

        // Perform the swap - transfer bonds from 'from' to 'to'
        _transfer(from, to, tokenAmount);

        // Transfer stablecoins from 'to' to 'from' as payment
        stablecoin.safeTransferFrom(to, from, stablecoinAmount);

        // Update last claimed coupon if needed
        if (lastClaimedCoupon[to] == 0) {
            lastClaimedCoupon[to] = block.timestamp;
        }

        // Emit an event for the swap
        emit BondSwapped(from, to, tokenAmount, stablecoinAmount);
    }
}

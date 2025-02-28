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

    // Document URI for legal documentation
    string public documentURI;

    // Add a state variable to store document hash
    bytes32 public documentHash;

    //-------------------- Bond Details ------------------------------------//

    // Unique identifier or name for the bond
    uint256 public bondId;
    // Bond issuer's address
    address public issuer;
    // Maximum number of bonds that can be issued
    uint256 public maxBondSupply;
    // UNIX timestamp for maturity, after which bond can be redeemed
    uint256 public maturityDate;
    // Total principal amount of the bond
    uint256 public faceValue;
    // Annual coupon rate (e.g., in basis points)
    uint256 public couponRate;
    // Number of coupon payments per year
    uint256 public couponFrequency;
    // Date the bond was issued
    uint256 public issueDate;
    // Date of the last coupon payment
    uint256 public lastCouponPaymentDate;
    // Total number of coupons paid
    uint256 public totalCouponsPaid;
    // Track last coupon claimed by each holder
    mapping(address => uint256) public lastClaimedCoupon;

    uint256 public totalBondsMinted;

    // e.g., USDC, USDT, DAI etc.
    IERC20 public stablecoin;

    // Security related state variables

    // Whitelist of addresses allowed to hold tokens
    mapping(address => bool) public whitelist;

    // Track if an address has passed KYC
    mapping(address => bool) public kycApproved;

    //-------------------- Events ------------------------------------//
    event BondMinted(
        address indexed to,
        uint256 bondAmount,
        uint256 tokenAmount
    );
    // Events for bond purchase, coupon payment, and bond redemption
    event BondPurchased(address indexed buyer, uint256 bondAmount);
    event CouponPaid(address indexed claimer, uint256 couponAmount);
    event BondRedeemed(address indexed redeemer, uint256 redemptionAmount);

    // Events for compliance tracking
    event DocumentUpdated(string documentURI);
    event AddedToWhitelist(address indexed account);
    event RemovedFromWhitelist(address indexed account);
    event KycStatusChanged(address indexed account, bool approved);

    // Add an event for document hash updates
    event DocumentHashUpdated(bytes32 indexed documentHash);

    //-------------------- Fractionalization ------------------------------------//

    // Total ERC20 tokens representing one bond
    uint256 public tokensPerBond;

    // Price of one full bond (in stablecoin units)
    uint256 public bondPrice;

    // Total amount raised from bond sales
    uint256 public totalRaised;

    constructor(
        string memory name,
        string memory symbol,
        uint256 _faceValue,
        uint256 _couponRate,
        uint256 _couponFrequency,
        uint256 _maturityDate,
        address _issuer,
        address _stablecoinAddress,
        uint256 _tokensPerBond,
        uint256 _bondPrice,
        uint256 _maxBondSupply
    ) ERC20(name, symbol) Ownable(msg.sender) {
        faceValue = _faceValue;
        couponRate = _couponRate;
        couponFrequency = _couponFrequency;
        maturityDate = _maturityDate;
        issuer = _issuer;
        issueDate = block.timestamp;
        stablecoin = IERC20(_stablecoinAddress);
        tokensPerBond = _tokensPerBond;
        bondPrice = _bondPrice;
        maxBondSupply = _maxBondSupply;
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
            totalBondsMinted + bondAmount <= maxBondSupply,
            "Exceeds maximum bond supply"
        );
        require(block.timestamp < maturityDate, "Bond has matured");

        // Calculate total future coupon payments
        uint256 remainingCoupons = ((maturityDate - block.timestamp) *
            couponFrequency) / 365 days;
        uint256 totalCouponPayments = (bondAmount *
            faceValue *
            couponRate *
            remainingCoupons) / (10000 * couponFrequency);

        // Ensure contract has enough stablecoin for coupon payments and principal
        require(
            stablecoin.balanceOf(address(this)) >=
                totalCouponPayments + (bondAmount * faceValue),
            "Insufficient stablecoin reserve for future payments"
        );

        uint256 tokenAmount = bondAmount * tokensPerBond;
        _mint(to, tokenAmount);
        totalBondsMinted += bondAmount;

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
        documentURI = _documentURI;
        emit DocumentUpdated(_documentURI);
    }

    // Add a function to set the document hash
    function setDocumentHash(bytes32 _documentHash) external onlyOwner {
        documentHash = _documentHash;
        emit DocumentHashUpdated(_documentHash);
    }

    // Optionally add a function to verify a document's content matches the stored hash
    function verifyDocument(
        string calldata documentContent
    ) external view returns (bool) {
        bytes32 calculatedHash = keccak256(abi.encodePacked(documentContent));
        return calculatedHash == documentHash;
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
        if (block.timestamp >= maturityDate) {
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

    //-------------------- Do not use the following with Marketplace ------------------------------------//
    // These cannot be used together with the marketplace as the msg.sender will be the marketplace contract
    // and not the buyer. The stablecoins will not be debited correctly.
    // It is still fully functional on its own if we do not use marketplace as the intermediary

    /**
     * @notice Purchase a bond by sending stablecoin to the contract
     * @param bondAmount Number of bonds to purchase
     */
    function purchaseBond(uint256 bondAmount) external {
        require(block.timestamp < maturityDate, "Bond no longer for sale");
        uint256 totalPrice = bondAmount * bondPrice;
        require(
            totalRaised + totalPrice <= maxBondSupply,
            "Exceeds maximum bond supply"
        );
        stablecoin.safeTransferFrom(msg.sender, address(this), totalPrice);
        _mint(msg.sender, bondAmount * tokensPerBond);
        totalRaised += totalPrice;
        emit BondPurchased(msg.sender, bondAmount);
    }

    /**
     * @notice Claim coupon payments for the bond
     */
    function claimCoupon() external {
        require(balanceOf(msg.sender) > 0, "No bonds held");
        require(
            block.timestamp >=
                lastClaimedCoupon[msg.sender] + (365 days / couponFrequency),
            "Too early"
        );

        // Calculate semi-annual coupon (annual rate divided by frequency)
        uint256 couponAmount = (balanceOf(msg.sender) *
            faceValue *
            couponRate) / (10000 * tokensPerBond * couponFrequency);
        lastClaimedCoupon[msg.sender] = block.timestamp;
        stablecoin.safeTransfer(msg.sender, couponAmount);
        emit CouponPaid(msg.sender, couponAmount);
    }

    /**
     * @notice Redeem the bond after maturity to the address that is calling the function
     */
    function redeem() external {
        require(block.timestamp >= maturityDate, "Bond not matured");
        uint256 bondTokens = balanceOf(msg.sender);
        require(bondTokens > 0, "No bonds to redeem");

        uint256 redemptionAmount = (bondTokens * faceValue) / tokensPerBond;
        _burn(msg.sender, bondTokens);
        stablecoin.safeTransfer(msg.sender, redemptionAmount);
        emit BondRedeemed(msg.sender, redemptionAmount);
    }

    //--------------------- End of functions not to be used with Marketplace -------------------------------//

    /**
     * @notice Purchase a bond by sending stablecoin to the contract
     * @param buyer The address of the buyer purchasing the bonds
     * @param bondAmount Number of bonds to purchase
     */
    function purchaseBondFor(address buyer, uint256 bondAmount) external {
        require(block.timestamp < maturityDate, "Bond no longer for sale");
        uint256 totalPrice = bondAmount * bondPrice;
        require(
            totalRaised + totalPrice <= maxBondSupply,
            "Exceeds maximum bond supply"
        );
        // Pull stablecoin from the buyer's account
        stablecoin.safeTransferFrom(buyer, address(this), totalPrice);
        _mint(buyer, bondAmount * tokensPerBond);
        totalRaised += totalPrice;
        emit BondPurchased(buyer, bondAmount);
    }

    /**
     * @notice Claim coupon payments on behalf of a given address.
     * @param claimer The address for which to claim coupon payments.
     */
    function claimCouponFor(address claimer) external {
        require(balanceOf(claimer) > 0, "No bonds held");
        require(
            block.timestamp >=
                lastClaimedCoupon[claimer] + (365 days / couponFrequency),
            "Too early"
        );

        uint256 couponAmount = (balanceOf(claimer) * faceValue * couponRate) /
            (10000 * tokensPerBond * couponFrequency);
        lastClaimedCoupon[claimer] = block.timestamp;
        stablecoin.safeTransfer(claimer, couponAmount);
        emit CouponPaid(claimer, couponAmount);
    }

    /**
     * @notice Redeem the bond after maturity to a specified address so this function can be called by anyone
     * @param redeemer The address to which the redemption amount will be transferred
     */
    function redeemFor(address redeemer) external {
        require(block.timestamp >= maturityDate, "Bond not matured");
        uint256 bondTokens = balanceOf(redeemer);
        require(bondTokens > 0, "No bonds to redeem");

        uint256 redemptionAmount = (bondTokens * faceValue) / tokensPerBond;
        _burn(redeemer, bondTokens);
        stablecoin.safeTransfer(redeemer, redemptionAmount);
        emit BondRedeemed(redeemer, redemptionAmount);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Using ERC20 from OpenZeppelin as the base
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// Using SafeERC20 from OpenZeppelin to avoid reentrancy attacks
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TokenizedBond
 * @dev ERC20 token representing a bond with a fixed coupon rate and maturity date
 * @author whanyu1212
 * @notice This is a simple implementation which may not be production-ready
 */
contract TokenizedBond is ERC20 {
    // has additional safety features implemented
    // using means that the functions from SafeERC20 can be called directly
    using SafeERC20 for IERC20;

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

    // e.g., USDC, USDT, DAI etc.
    IERC20 public stablecoin;

    //-------------------- Fractionalization ------------------------------------//

    // Total ERC20 tokens representing one bond
    uint256 public tokensPerBond;

    // Price of one full bond (in stablecoin units)
    uint256 public bondPrice;

    // Total amount raised from bond sales
    uint256 public totalRaised;

    //-------------------- Events --------------------//
    event CouponPaid(address indexed holder, uint256 amount);
    event BondPurchased(address indexed buyer, uint256 amount);
    event BondMatured();
    event BondRedeemed(address indexed holder, uint256 amount);

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
    ) ERC20(name, symbol) {
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
     * @notice Redeem the bond after maturity
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
}

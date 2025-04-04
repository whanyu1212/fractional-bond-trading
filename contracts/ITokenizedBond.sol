// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ITokenizedBond
 * @dev Interface for TokenizedBond contract
 */
interface ITokenizedBond is IERC20 {
    //-------------------- Enums --------------------//
    enum TransferStatus {
        Unrestricted,
        Restricted,
        Frozen
    }

    //-------------------- Events --------------------//
    event CouponPaid(address indexed holder, uint256 amount);
    event BondPurchased(address indexed buyer, uint256 amount);
    event BondMatured();
    event BondRedeemed(address indexed holder, uint256 amount);
    event BondMinted(
        address indexed to,
        uint256 bondAmount,
        uint256 tokenAmount
    );

    //-------------------- View Functions --------------------//
    function bondId() external view returns (uint256);
    function issuer() external view returns (address);
    function maxBondSupply() external view returns (uint256);
    function maturityDate() external view returns (uint256);
    function faceValue() external view returns (uint256);
    function couponRate() external view returns (uint256);
    function couponFrequency() external view returns (uint256);
    function issueDate() external view returns (uint256);
    function lastCouponPaymentDate() external view returns (uint256);
    function totalCouponsPaid() external view returns (uint256);
    function lastClaimedCoupon(address holder) external view returns (uint256);
    function stablecoin() external view returns (IERC20);
    function tokensPerBond() external view returns (uint256);
    function bondPrice() external view returns (uint256);
    function totalRaised() external view returns (uint256);
    function getTokensPerBond() external view returns (uint256);

    //-------------------- State-Changing Functions --------------------//
    /**
     * @notice Mint new bonds
     * @param to The address to which the tokens will be minted
     * @param bondAmount The amount of bonds to mint
     */
    function mintBond(address to, uint256 bondAmount) external;

    //-------------------- For interaction with the marketplace --------------------//
    /**
     * @notice Purchase of bonds in terms of tokens
     * @param buyer The address of the buyer
     * @param tokenAmount The amount of tokens to purchase
     */
    function purchaseBondFor(address buyer, uint256 tokenAmount) external;

    /**
     * @notice Claim coupon payments for the bond
     * @param holder The address for which to claim the coupon
     */
    function claimCouponFor(address holder) external;

    /**
     * @notice Redeem the bond after maturity to the address that is calling the function
     */
    function redeemFor(address holder) external;

    /**
     * @notice exchange of bond tokens between 2 participants
     * @param from The address of the sender
     * @param to The address of the receiver
     * @param tokenAmount The amount of tokens to exchange
     * @param stablecoinAmount The amount of stablecoins to exchange
     */
    function exchangeBonds(
        address from,
        address to,
        uint256 tokenAmount,
        uint256 stablecoinAmount
    ) external;

    /**
     * @notice Batch claim coupon payments for multiple holders
     * @param claimers The addresses of the holders for whom to claim coupons
     * @return successfulClaims An array of booleans indicating the success of each claim
     * @return totalClaimed The total amount of coupons claimed
     */
    function batchClaimCoupons(
        address[] calldata claimers
    ) external returns (bool[] memory successfulClaims, uint256 totalClaimed);

    /**
     * @notice Batch redeem bonds for multiple holders
     * @param redeemers The addresses of the holders to redeem bonds for
     * @return successfulRedemptions An array of booleans indicating the success of each redemption
     * @return totalRedeemed The total amount of bonds redeemed
     */
    function batchRedeemBonds(
        address[] calldata redeemers
    )
        external
        returns (bool[] memory successfulRedemptions, uint256 totalRedeemed);
}

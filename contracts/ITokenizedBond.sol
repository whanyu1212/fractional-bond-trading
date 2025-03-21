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
}

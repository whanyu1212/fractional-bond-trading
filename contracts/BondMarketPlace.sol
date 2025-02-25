// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ITokenizedBond.sol";

/**
 * @title BondMarketPlace
 * @dev A marketplace for listing and purchasing tokenized bonds
 * @author whanyu1212
 * @notice This is a simple implementation which may not be production-ready
 */
contract BondMarketPlace {
    // --------------------- Marketplace details --------------------- //

    // General registry of the bonds listed on the marketplace
    mapping(uint256 => ITokenizedBond) public bonds;

    // Is bond listed/active
    mapping(uint256 => bool) public bondStatus;

    // --------------------- Bond related --------------------- //
    // Who listed the bond
    mapping(uint256 => address) public bondIssuers;
    // Price at listing time
    mapping(uint256 => uint256) public listingPrice;

    //--------------------- Market Analytics related --------------------- //

    // Maybe meant for a dashboard for users to see, we have to brainstorm on this

    // Historical record of holders
    mapping(uint256 => address[]) public bondHolders;
    // When bond was listed
    mapping(uint256 => uint256) public bondListingTime;
    // Has bond matured
    mapping(uint256 => bool) public bondMatured;

    // --------------------- Events --------------------- //

    // Bond listed event
    event BondListed(
        uint256 indexed bondId,
        address indexed issuer,
        uint256 price
    );

    // Purchase event
    event BondPurchaseRecorded(
        uint256 indexed bondId,
        address indexed buyer,
        uint256 amount
    );

    // Maturity event
    event BondMaturityUpdated(uint256 indexed bondId, bool matured);

    // Redemption event
    event BondRedemptionRecorded(
        uint256 indexed bondId,
        address indexed holder,
        uint256 amount
    );

    // --------------------- Modifiers --------------------- //

    /**
     * @dev Modifier to check if the caller is the issuer of the bond
     */
    modifier onlyIssuer(uint256 bondId) {
        require(
            bondIssuers[bondId] == msg.sender,
            "Only the issuer can call this function"
        );
        _;
    }

    // --------------------- State-Changing Functions --------------------- //

    /**
     * @notice List a bond on the marketplace
     * @param bondId The identifier for the bond listing
     * @param bondAddress The address of the tokenized bond contract
     * @param price The listing price for the bond
     */
    function listBond(
        uint256 bondId,
        ITokenizedBond bondAddress,
        uint256 price
    ) external {
        require(!bondStatus[bondId], "Bond already listed");
        require(address(bondAddress) != address(0), "Invalid bond address");

        bonds[bondId] = bondAddress;
        bondIssuers[bondId] = msg.sender;
        listingPrice[bondId] = price;
        bondStatus[bondId] = true;
        bondListingTime[bondId] = block.timestamp;

        emit BondListed(bondId, msg.sender, price);
    }

    /**
     * @notice Modify the bond's listing details (for now, only the price)
     * @param bondId The identifier for the bond listing
     * @param newPrice The new listing price for the bond
     */
    function modifyListing(
        uint256 bondId,
        uint256 newPrice
    ) external onlyIssuer(bondId) {
        require(bondStatus[bondId], "Bond not listed");
        listingPrice[bondId] = newPrice;
        // Optional to update the listing time
        bondListingTime[bondId] = block.timestamp;
        // Emit the event again
        emit BondListed(bondId, msg.sender, newPrice);
    }

    /**
     * @notice Purchase a bond from the marketplace
     * @param bondId The identifier for the bond listing
     * @param amount The amount of bonds to purchase
     */
    function purchaseBond(uint256 bondId, uint256 amount) external {
        require(bondStatus[bondId], "Bond is not listed");
        ITokenizedBond bond = bonds[bondId];

        // Record the purchase in marketplace before actual purchase
        // This state variable helps to track the bond holders
        // We can potentially use it for some visualization
        if (!isExistingHolder(bondId, msg.sender)) {
            bondHolders[bondId].push(msg.sender);
        }

        // Call the function in the bond contract to purchase the bond
        bond.purchaseBondFor(msg.sender, amount);

        emit BondPurchaseRecorded(bondId, msg.sender, amount);
    }

    /**
     * @notice Claim the coupon for a bond
     * @param bondId The identifier for the bond listing
     */
    function claimCoupon(uint256 bondId) external {
        require(bondStatus[bondId], "Bond is not listed");
        ITokenizedBond bond = bonds[bondId];
        // Forward the coupon claim using the buyer's address
        bond.claimCouponFor(msg.sender);
    }

    /**
     * @notice Redeem a bond (upon maturity)
     * @param bondId The identifier for the bond listing
     */
    function redeemBond(uint256 bondId) external {
        require(bondStatus[bondId], "Bond does not exist");
        ITokenizedBond bond = bonds[bondId];

        // No. of tokens that the caller holds before calling redemption
        uint256 preBalance = bond.balanceOf(msg.sender);
        require(preBalance > 0, "No bonds to redeem");

        // Call redeemFor so that redeem logic is executed for msg.sender
        // Do not call redeem() directly as it will redeem for the contract
        bond.redeemFor(msg.sender);

        emit BondRedemptionRecorded(bondId, msg.sender, preBalance);
    }

    /**
     * @notice Check if a given address is a holder of a bond listing
     * @param bondId The identifier for the bond listing
     * @param holder The address to check
     * @return A boolean indicating if the address is a holder
     */
    function isExistingHolder(
        uint256 bondId,
        address holder
    ) internal view returns (bool) {
        for (uint i = 0; i < bondHolders[bondId].length; i++) {
            if (bondHolders[bondId][i] == holder) {
                return true;
            }
        }
        // if returns false, we can add the holder to the bondHolders list in purchaseBond
        return false;
    }

    /**
     * @notice Get the bond details for a given bond listing
     * @param bondId The identifier for the bond listing
     * @return issuer The address of the bond issuer
     * @return price The listing price for the bond
     * @return listingTime The time when the bond was listed
     * @return isMatured A boolean indicating if the bond has matured
     * @return totalHolders The total number of bond holders
     */
    function getBondInfo(
        uint256 bondId
    )
        external
        view
        returns (
            address issuer,
            uint256 price,
            uint256 listingTime,
            bool isMatured,
            uint256 totalHolders
        )
    {
        require(bondStatus[bondId], "Bond not listed");
        return (
            bondIssuers[bondId],
            listingPrice[bondId],
            bondListingTime[bondId],
            bondMatured[bondId],
            bondHolders[bondId].length
        );
    }
    /**
     * @notice Get all bond holders for a given bond
     * @param bondId The identifier for the bond listing
     * @return An array of addresses representing the bond holders
     */
    function getAllBondHolders(
        uint256 bondId
    ) external view returns (address[] memory) {
        return bondHolders[bondId];
    }
}

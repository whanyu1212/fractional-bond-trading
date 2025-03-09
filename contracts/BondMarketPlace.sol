// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ITokenizedBond.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BondMarketPlace
 * @dev A marketplace for listing and purchasing tokenized bonds
 * @author whanyu1212
 * @notice This is a simple implementation which may not be production-ready
 */
contract BondMarketPlace is Ownable {
    constructor() Ownable(msg.sender) {}
    // --------------------- Listing related --------------------- //

    struct BondListing {
        ITokenizedBond bondContract; // The bond contract
        address issuer; // Who listed the bond
        uint256 listingPrice; // Current listing price
        bool isListed; // Active status
        uint256 listingTime; // Initial listing timestamp
        bool matured; // Maturity status
        address[] holders; // Historical holders
    }

    //--------------------- Market Analytics related --------------------- //
    struct MarketAnalytics {
        uint256 lastTradePrice; // Last price bond was traded at
        uint256 totalTradingVolume; // Total volume traded
        uint256[] historicalPrices; // Array of historical prices
        uint256[] tradingTimes; // Timestamps of trades
        uint256 numberOfTrades; // Total number of trades
        mapping(address => uint256) holderBalances; // Current balance of each holder
        uint256 averageHoldingTime; // Average time bonds are held
        uint256 totalValueLocked; // Total value locked in the bond
    }

    // Main registry combining both structs
    mapping(uint256 => BondListing) public bondListings;
    mapping(uint256 => MarketAnalytics) public bondAnalytics;

    // Additional market statistics
    uint256 public totalListedBonds;
    uint256 public totalTradingVolume;
    mapping(address => uint256) public userTradingVolume; // Trading volume per user
    mapping(address => uint256) public userBondCount; // Number of bonds held by user

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
            bondListings[bondId].issuer == msg.sender,
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
        require(!bondListings[bondId].isListed, "Bond already listed");
        require(address(bondAddress) != address(0), "Invalid bond address");

        bondListings[bondId] = BondListing({
            bondContract: bondAddress,
            issuer: msg.sender,
            listingPrice: price,
            isListed: true,
            listingTime: block.timestamp,
            matured: false,
            holders: new address[](0)
        });

        totalListedBonds++;
        emit BondListed(bondId, msg.sender, price);
    }

    /**
     * @notice Modify the bond's listing details (for now, only the price)
     * @param bondId The identifier for the bond listing
     * @param newPrice The new listing price for the bond
     */
    /**
     * @notice Modify the bond's listing details (for now, only the price)
     * @param bondId The identifier for the bond listing
     * @param newPrice The new listing price for the bond
     */
    function modifyListing(
        uint256 bondId,
        uint256 newPrice
    ) external onlyIssuer(bondId) {
        require(bondListings[bondId].isListed, "Bond not listed");

        BondListing storage listing = bondListings[bondId];
        listing.listingPrice = newPrice;
        listing.listingTime = block.timestamp; // Optional timestamp update

        emit BondListed(bondId, msg.sender, newPrice);
    }

    /**
     * @notice Purchase a bond from the marketplace
     * @param bondId The identifier for the bond listing
     * @param amount The amount of bonds to purchase
     */
    function purchaseBond(uint256 bondId, uint256 amount) external {
        BondListing storage listing = bondListings[bondId];
        require(listing.isListed, "Bond is not listed");
        require(!listing.matured, "Bond has matured");

        // Record the purchase in marketplace before actual purchase
        if (!isExistingHolder(bondId, msg.sender)) {
            listing.holders.push(msg.sender);
            userBondCount[msg.sender]++;
        }

        // Update market analytics
        MarketAnalytics storage analytics = bondAnalytics[bondId];
        analytics.lastTradePrice = listing.listingPrice;
        analytics.historicalPrices.push(listing.listingPrice);
        analytics.tradingTimes.push(block.timestamp);
        analytics.numberOfTrades++;
        analytics.totalTradingVolume += amount;
        analytics.holderBalances[msg.sender] += amount;

        // Update global statistics
        totalTradingVolume += amount;
        userTradingVolume[msg.sender] += amount;

        // Call the function in the bond contract to purchase the bond
        listing.bondContract.purchaseBondFor(msg.sender, amount);

        emit BondPurchaseRecorded(bondId, msg.sender, amount);
    }

    /**
     * @notice Claim the coupon for a bond
     * @param bondId The identifier for the bond listing
     */
    function claimCoupon(uint256 bondId) external {
        BondListing storage listing = bondListings[bondId];
        require(listing.isListed, "Bond is not listed");
        require(!listing.matured, "Bond has matured");

        // Check if caller has any bonds to claim coupon for
        uint256 balance = listing.bondContract.balanceOf(msg.sender);
        require(balance > 0, "No bonds held");

        // Forward the coupon claim using the caller's address
        listing.bondContract.claimCouponFor(msg.sender);
    }

    /**
     * @notice Update the maturity status of a bond
     * @param bondId The identifier for the bond listing
     * @param matured Whether the bond has matured
     */
    function updateBondMaturity(uint256 bondId, bool matured) external {
        BondListing storage listing = bondListings[bondId];
        require(listing.isListed, "Bond not listed");

        // Only allow the issuer or the marketplace admin to update maturity
        require(
            msg.sender == listing.issuer || msg.sender == owner(),
            "Not authorized"
        );

        listing.matured = matured;

        emit BondMaturityUpdated(bondId, matured);
    }

    /**
     * @notice Redeem a bond (upon maturity)
     * @param bondId The identifier for the bond listing
     */
    function redeemBond(uint256 bondId) external {
        BondListing storage listing = bondListings[bondId];
        require(listing.isListed, "Bond does not exist");
        require(listing.matured, "Bond has not matured");

        // Get caller's balance before redemption
        uint256 preBalance = listing.bondContract.balanceOf(msg.sender);
        require(preBalance > 0, "No bonds to redeem");

        // Update market analytics - add a check to prevent underflow
        MarketAnalytics storage analytics = bondAnalytics[bondId];

        // Make sure we don't subtract more than what's in the balance
        uint256 currentBalance = analytics.holderBalances[msg.sender];
        if (currentBalance >= preBalance) {
            analytics.holderBalances[msg.sender] -= preBalance;
        } else {
            analytics.holderBalances[msg.sender] = 0;
        }

        // Similar check for totalValueLocked
        if (analytics.totalValueLocked >= preBalance) {
            analytics.totalValueLocked -= preBalance;
        } else {
            analytics.totalValueLocked = 0;
        }

        // Call redeemFor so that redeem logic is executed for msg.sender
        listing.bondContract.redeemFor(msg.sender);

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
        BondListing storage listing = bondListings[bondId];
        require(listing.isListed, "Bond not listed");

        for (uint i = 0; i < listing.holders.length; i++) {
            if (listing.holders[i] == holder) {
                return true;
            }
        }
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
        BondListing storage listing = bondListings[bondId];
        require(listing.isListed, "Bond not listed");

        return (
            listing.issuer,
            listing.listingPrice,
            listing.listingTime,
            listing.matured,
            listing.holders.length
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
        BondListing storage listing = bondListings[bondId];
        require(listing.isListed, "Bond not listed");

        return listing.holders;
    }

    // --------------------- Analytics Functions --------------------- //

    /**
     * @notice Record a trade for a bond listing
     * @param bondId The identifier for the bond listing
     * @param price The trading of the bond
     */
    function recordTrade(uint256 bondId, uint256 price) internal {
        MarketAnalytics storage analytics = bondAnalytics[bondId];
        analytics.historicalPrices.push(price);
        analytics.tradingTimes.push(block.timestamp);
        analytics.lastTradePrice = price;
        analytics.numberOfTrades++;
    }

    /**
     * @notice Update the trading volume for a bond listing
     * @param bondId The identifier for the bond listing
     * @param trader The address of the trader
     * @param amount The trading amount
     */
    function updateTradeVolume(
        uint256 bondId,
        address trader,
        uint256 amount
    ) internal {
        MarketAnalytics storage analytics = bondAnalytics[bondId];
        analytics.totalTradingVolume += amount;
        userTradingVolume[trader] += amount;
        totalTradingVolume += amount;
    }

    /**
     * @notice Get the market metrics for a given bond listing
     * @param bondId The identifier for the bond listing
     * @return lastPrice The last price the bond was traded at
     * @return volume24h The total trading volume in the last 24 hours
     * @return numberOfHolders The total number of bond holders
     * @return averageHoldingTime The average time bonds are held
     * @return totalValueLocked The total value locked in the bond
     */
    function getBondMarketMetrics(
        uint256 bondId
    )
        external
        view
        returns (
            uint256 lastPrice,
            uint256 volume24h,
            uint256 numberOfHolders,
            uint256 averageHoldingTime,
            uint256 totalValueLocked
        )
    {
        BondListing storage listing = bondListings[bondId];
        MarketAnalytics storage analytics = bondAnalytics[bondId];

        return (
            analytics.lastTradePrice,
            calculateVolume24h(bondId),
            listing.holders.length,
            analytics.averageHoldingTime,
            analytics.totalValueLocked
        );
    }

    /**
     * @notice Get the metrics for a given user
     * @param user The address of the user
     * @return bondsHeld The number of bonds held by the user
     * @return totalVolume The total trading volume by the user
     * @return activePositions An array of bondIds where the user has non-zero balance
     */
    function getUserMetrics(
        address user
    )
        external
        view
        returns (
            uint256 bondsHeld,
            uint256 totalVolume,
            uint256[] memory activePositions
        )
    {
        return (
            userBondCount[user],
            userTradingVolume[user],
            getUserActivePositions(user)
        );
    }

    /**
     * @dev Calculate the trading volume in the last 24 hours for a given bond
     * @param bondId The identifier for the bond listing
     * @return volume24h The total trading volume in the last 24 hours
     */
    function calculateVolume24h(
        uint256 bondId
    ) internal view returns (uint256) {
        MarketAnalytics storage analytics = bondAnalytics[bondId];
        uint256 volume24h = 0;
        uint256 timestamp24hAgo = block.timestamp - 24 hours;

        // Iterate through trading history backwards to find recent trades
        for (uint256 i = analytics.tradingTimes.length; i > 0; i--) {
            // Break if we've gone past 24 hours
            if (analytics.tradingTimes[i - 1] < timestamp24hAgo) {
                break;
            }

            // Add to 24h volume if trade was within last 24 hours
            if (analytics.tradingTimes[i - 1] >= timestamp24hAgo) {
                volume24h += analytics.historicalPrices[i - 1];
            }
        }

        return volume24h;
    }

    /**
     * @dev Get all active bond positions for a given user
     * @param user The address of the user
     * @return activePositions Array of bondIds where user has non-zero balance
     */
    function getUserActivePositions(
        address user
    ) internal view returns (uint256[] memory) {
        // First pass: count number of active positions
        uint256 activeCount = 0;
        for (uint256 i = 0; i < totalListedBonds; i++) {
            BondListing storage listing = bondListings[i];
            if (listing.isListed && bondAnalytics[i].holderBalances[user] > 0) {
                activeCount++;
            }
        }

        // Second pass: populate array with active positions
        uint256[] memory activePositions = new uint256[](activeCount);
        uint256 currentIndex = 0;

        for (uint256 i = 0; i < totalListedBonds; i++) {
            BondListing storage listing = bondListings[i];
            if (listing.isListed && bondAnalytics[i].holderBalances[user] > 0) {
                activePositions[currentIndex] = i;
                currentIndex++;
            }
        }

        return activePositions;
    }
}

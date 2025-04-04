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
    constructor() Ownable(msg.sender) {} // Single address as the "owner" of the marketplace
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

    // Bond delisted event
    event BondDelisted(uint256 indexed bondId, address indexed delister);

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

    // Exchange event
    event BondExchanged(
        uint256 indexed bondId,
        address indexed from,
        address indexed to,
        uint256 tokenAmount,
        uint256 stablecoinAmount
    );

    // Gift event
    event BondGifted(
        uint256 indexed bondId,
        address indexed from,
        address indexed to,
        uint256 tokenAmount
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
     * @notice Delist a bond from the marketplace
     * @param bondId The identifier for the bond to delist
     */
    function delistBond(uint256 bondId) external {
        BondListing storage listing = bondListings[bondId];
        require(listing.isListed, "Bond is not listed");

        // Only the issuer or marketplace owner can delist
        require(
            msg.sender == listing.issuer || msg.sender == owner(),
            "Not authorized to delist"
        );

        // marketplace can only delist if there are no pending trades
        // require(
        //     listing.bondContract.balanceOf(address(this)) == 0,
        //     "Cannot delist with pending trades"
        // );

        listing.isListed = false;
        listing.listingPrice = 0;
        totalListedBonds--;

        emit BondDelisted(bondId, msg.sender);
    }

    //--------------------- Purchase Functions --------------------- //

    /**
     * @notice Purchase a bond from the marketplace
     * @param bondId The identifier for the bond listing
     * @param bondAmount The amount of *whole* bonds to purchase
     */
    function purchaseBond(uint256 bondId, uint256 bondAmount) external {
        // Renamed param for clarity
        BondListing storage listing = bondListings[bondId];
        require(listing.isListed, "Bond is not listed");
        require(!listing.matured, "Bond has matured");
        require(bondAmount > 0, "Cannot purchase zero bonds"); // Added check

        // --- Calculate Fractional Token Amount ---
        uint256 tokensPerBond = listing.bondContract.getTokensPerBond(); // OR access via public state/struct getter
        require(tokensPerBond > 0, "Invalid tokensPerBond");
        uint256 fractionalTokenAmount = bondAmount * tokensPerBond;
        // Overflow check
        if (bondAmount > 0) {
            // Already checked > 0
            require(
                fractionalTokenAmount / bondAmount == tokensPerBond,
                "Purchase: Fractional token overflow"
            );
        }

        // --- Record the purchase in marketplace analytics ---
        MarketAnalytics storage analytics = bondAnalytics[bondId];

        // Update based on fractional tokens
        if (analytics.holderBalances[msg.sender] == 0) {
            // If first time holding this bond type according to analytics
            userBondCount[msg.sender]++; // Increment count of bond *types* held
            // listing.holders logic removed previously, assuming it's gone
        }

        // Update market analytics using calculated fractional amount
        analytics.lastTradePrice = listing.listingPrice; // This is price per WHOLE bond from listing
        analytics.historicalPrices.push(listing.listingPrice); // Still log listing price
        analytics.tradingTimes.push(block.timestamp);
        analytics.numberOfTrades++;
        // Volume calculation uses listing price (per whole bond) * number of whole bonds
        uint256 stablecoinVolume = listing.listingPrice * bondAmount;
        // Overflow check for volume
        if (bondAmount > 0) {
            // Check bondAmount > 0
            require(
                stablecoinVolume / bondAmount == listing.listingPrice,
                "Purchase: Volume calculation overflow"
            );
        }
        analytics.totalTradingVolume += stablecoinVolume;

        // *** IMPORTANT: Update holder balance with FRACTIONAL token amount ***
        analytics.holderBalances[msg.sender] += fractionalTokenAmount;

        // --- Update global statistics ---
        totalTradingVolume += stablecoinVolume;
        userTradingVolume[msg.sender] += stablecoinVolume;

        // --- Call the function in the bond contract to purchase the bond ---
        listing.bondContract.purchaseBondFor(msg.sender, bondAmount);

        // --- Emit Event ---
        // Event should likely reflect fractional tokens and stablecoin amount
        emit BondPurchaseRecorded(bondId, msg.sender, fractionalTokenAmount);
    }

    //--------------------- Coupon Functions --------------------- //

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
     * @notice Claim coupon payments for multiple holders of a bond
     * @param bondId The identifier for the bond listing
     * @param claimers Array of addresses for which to claim coupons
     * @return successfulClaims Array indicating which claims were successful
     * @return totalClaimed Total amount of stablecoins claimed
     */
    function batchClaimCoupons(
        uint256 bondId,
        address[] calldata claimers
    ) external returns (bool[] memory successfulClaims, uint256 totalClaimed) {
        BondListing storage listing = bondListings[bondId];
        require(listing.isListed, "Bond is not listed");
        require(!listing.matured, "Bond has matured");

        // Forward the batch claim to the bond contract
        return listing.bondContract.batchClaimCoupons(claimers);
    }

    /**
     * @notice Claim coupon payments for multiple holders across multiple bonds
     * @param bondIds Array of bond identifiers
     * @param claimers Array of addresses for which to claim coupons (same length as bondIds)
     * @return successCounts Number of successful claims for each bond
     * @return totalAmounts Total amount claimed for each bond
     */
    function multiClaimCoupons(
        uint256[] calldata bondIds,
        address[][] calldata claimers
    )
        external
        returns (uint256[] memory successCounts, uint256[] memory totalAmounts)
    {
        require(bondIds.length == claimers.length, "Array lengths must match");

        successCounts = new uint256[](bondIds.length);
        totalAmounts = new uint256[](bondIds.length);

        for (uint256 i = 0; i < bondIds.length; i++) {
            BondListing storage listing = bondListings[bondIds[i]];

            if (!listing.isListed || listing.matured) {
                continue;
            }

            (bool[] memory successes, uint256 total) = listing
                .bondContract
                .batchClaimCoupons(claimers[i]);

            // Count successful claims
            for (uint256 j = 0; j < successes.length; j++) {
                if (successes[j]) {
                    successCounts[i]++;
                }
            }

            totalAmounts[i] = total;
        }

        return (successCounts, totalAmounts);
    }

    //--------------------- Maturity and Redemption Functions --------------------- //

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
     * @notice Redeem bonds for multiple holders of a bond
     * @param bondId The identifier for the bond listing
     * @param redeemers Array of addresses for which to redeem bonds
     * @return successfulRedemptions Array indicating which redemptions were successful
     * @return totalRedeemed Total amount of stablecoins redeemed
     */
    function batchRedeemBonds(
        uint256 bondId,
        address[] calldata redeemers
    )
        external
        returns (bool[] memory successfulRedemptions, uint256 totalRedeemed)
    {
        BondListing storage listing = bondListings[bondId];
        require(listing.isListed, "Bond does not exist");
        require(listing.matured, "Bond has not matured");

        // Update market analytics before redemption
        MarketAnalytics storage analytics = bondAnalytics[bondId];

        // Forward the batch redemption to the bond contract
        (successfulRedemptions, totalRedeemed) = listing
            .bondContract
            .batchRedeemBonds(redeemers);

        // Update analytics for each successful redemption
        for (uint256 i = 0; i < redeemers.length; i++) {
            if (successfulRedemptions[i]) {
                address redeemer = redeemers[i];

                // Get the pre-redemption balance from the analytics
                uint256 currentBalance = analytics.holderBalances[redeemer];

                // Update holder balances (set to 0 since all tokens are redeemed)
                if (currentBalance > 0) {
                    analytics.holderBalances[redeemer] = 0;

                    // Update TVL
                    if (analytics.totalValueLocked >= currentBalance) {
                        analytics.totalValueLocked -= currentBalance;
                    } else {
                        analytics.totalValueLocked = 0;
                    }
                }

                // Emit marketplace event
                emit BondRedemptionRecorded(bondId, redeemer, currentBalance);
            }
        }

        return (successfulRedemptions, totalRedeemed);
    }

    /**
     * @notice Redeem bonds for multiple holders across multiple bonds
     * @param bondIds Array of bond identifiers
     * @param redeemers Array of arrays of addresses for which to redeem bonds
     * @return successCounts Number of successful redemptions for each bond
     * @return totalAmounts Total amount redeemed for each bond
     */
    function multiRedeemBonds(
        uint256[] calldata bondIds,
        address[][] calldata redeemers
    )
        external
        returns (uint256[] memory successCounts, uint256[] memory totalAmounts)
    {
        require(bondIds.length == redeemers.length, "Array lengths must match");

        successCounts = new uint256[](bondIds.length);
        totalAmounts = new uint256[](bondIds.length);

        for (uint256 i = 0; i < bondIds.length; i++) {
            BondListing storage listing = bondListings[bondIds[i]];

            if (!listing.isListed || !listing.matured) {
                continue;
            }

            (bool[] memory successes, uint256 total) = listing
                .bondContract
                .batchRedeemBonds(redeemers[i]);

            // Count successful redemptions
            for (uint256 j = 0; j < successes.length; j++) {
                if (successes[j]) {
                    successCounts[i]++;

                    // Update marketplace analytics
                    address redeemer = redeemers[i][j];
                    MarketAnalytics storage analytics = bondAnalytics[
                        bondIds[i]
                    ];

                    // Get the pre-redemption balance
                    uint256 currentBalance = analytics.holderBalances[redeemer];

                    // Update holder balances
                    if (currentBalance > 0) {
                        analytics.holderBalances[redeemer] = 0;

                        // Update TVL
                        if (analytics.totalValueLocked >= currentBalance) {
                            analytics.totalValueLocked -= currentBalance;
                        } else {
                            analytics.totalValueLocked = 0;
                        }
                    }

                    // Emit marketplace event
                    emit BondRedemptionRecorded(
                        bondIds[i],
                        redeemer,
                        currentBalance
                    );
                }
            }

            totalAmounts[i] = total;
        }

        return (successCounts, totalAmounts);
    }

    //--------------------- Exchange Functions --------------------- //

    /**
     * @notice Exchange bonds between two parties
     * @param bondId The identifier for the bond listing
     * @param from The address of the sender
     * @param to The address of the receiver
     * @param tokenAmount The amount of tokens to exchange
     * @param stablecoinAmount The amount of stablecoins to exchange
     */
    function exchangeBonds(
        uint256 bondId,
        address from,
        address to,
        uint256 tokenAmount,
        uint256 stablecoinAmount
    ) external {
        // Verify listing exists and isn't matured
        BondListing storage listing = bondListings[bondId];
        require(listing.isListed, "Bond is not listed");
        require(!listing.matured, "Bond has matured");

        // --- Update Market Analytics ---
        MarketAnalytics storage analytics = bondAnalytics[bondId];

        // For paid exchanges, update price tracking
        if (stablecoinAmount > 0 && tokenAmount > 0) {
            // Added tokenAmount > 0 check for price calc
            uint256 pricePerToken = stablecoinAmount / tokenAmount; // Price per fractional token
            analytics.lastTradePrice = pricePerToken;
            analytics.historicalPrices.push(pricePerToken);

            // Update volume statistics
            analytics.totalTradingVolume += stablecoinAmount; // Volume in stablecoin value
            totalTradingVolume += stablecoinAmount;
            // Associate volume with both parties in a trade
            userTradingVolume[from] += stablecoinAmount;
            userTradingVolume[to] += stablecoinAmount;
        }

        // Update common analytics
        analytics.tradingTimes.push(block.timestamp);
        analytics.numberOfTrades++;

        // --- Update Holder Balances (Marketplace View) ---
        // Check for underflow before subtracting
        require(
            analytics.holderBalances[from] >= tokenAmount,
            "Analytics: Insufficient sender balance"
        );
        analytics.holderBalances[from] -= tokenAmount;
        analytics.holderBalances[to] += tokenAmount;

        // --- REMOVED listing.holders and userBondCount logic ---

        // --- Execute the exchange through the bond contract ---
        // IMPORTANT: This call performs the actual token movements.
        // Requires BOTH:
        // 1. 'from' to have approved 'listing.bondContract' for 'tokenAmount' bond tokens.
        // 2. If stablecoinAmount > 0, 'to' to have approved 'listing.bondContract' for 'stablecoinAmount' stablecoins.
        listing.bondContract.exchangeBonds(
            from,
            to,
            tokenAmount, // Fractional bond tokens
            stablecoinAmount
        );

        // --- Emit appropriate marketplace events ---
        if (stablecoinAmount > 0) {
            emit BondExchanged(bondId, from, to, tokenAmount, stablecoinAmount);
        } else {
            emit BondGifted(bondId, from, to, tokenAmount);
        }
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
    // Add this function to your BondMarketPlace contract

    /**
     * @notice Get actual bond holdings for a user, including bond addresses, by querying contracts.
     * @dev Returns parallel arrays of bond IDs, their contract addresses, and token balances.
     * @dev This provides the most accurate balance, accounting for external transfers.
     * @dev May be more gas-intensive than getUserHoldings due to external calls.
     * @dev Relies on iterating through potentially listed bond IDs - efficiency depends on ID density.
     * @param user The address of the user whose holdings to query.
     * @return bondIds An array of bond IDs the user holds based on contract balances.
     * @return bondAddresses An array of corresponding ITokenizedBond contract addresses.
     * @return balances An array of corresponding token balances for each bond ID.
     */
    function getActualUserHoldingsWithDetails(
        address user
    )
        external
        view
        returns (
            uint256[] memory bondIds,
            address[] memory bondAddresses,
            uint256[] memory balances
        )
    {
        // --- First Pass: Count actual holdings by querying contracts ---
        uint256 activeCount = 0;
        uint256 loopLimit = totalListedBonds + 100; // arbitrary buffer, cannot exceed 1024

        for (uint256 bondId = 1; bondId <= loopLimit; bondId++) {
            BondListing storage listing = bondListings[bondId];
            // Check if listing exists (isListed flag) and contract address is valid
            if (
                listing.isListed && address(listing.bondContract) != address(0)
            ) {
                // Use try-catch for the external call to handle potential reverts
                try listing.bondContract.balanceOf(user) returns (
                    uint256 balance
                ) {
                    if (balance > 0) {
                        activeCount++;
                    }
                } catch {
                    continue;
                }
            }
        }

        // --- Second Pass: Populate arrays ---
        bondIds = new uint256[](activeCount);
        bondAddresses = new address[](activeCount); // Initialize the new addresses array
        balances = new uint256[](activeCount);
        uint256 currentIndex = 0;

        for (uint256 bondId = 1; bondId <= loopLimit; bondId++) {
            BondListing storage listing = bondListings[bondId];
            // Check again if listing exists and contract is valid
            if (
                listing.isListed && address(listing.bondContract) != address(0)
            ) {
                try listing.bondContract.balanceOf(user) returns (
                    uint256 balance
                ) {
                    if (balance > 0) {
                        bondIds[currentIndex] = bondId;
                        // Store the bond contract address
                        bondAddresses[currentIndex] = address(
                            listing.bondContract
                        );
                        balances[currentIndex] = balance;
                        currentIndex++;
                        // Optimization: Stop if we've found all expected active positions
                        if (currentIndex == activeCount) {
                            break;
                        }
                    }
                } catch {
                    // Ignore errors and continue
                    continue;
                }
            }
        }

        return (bondIds, bondAddresses, balances);
    }

    /**
     * @notice Get the marketplace's tracked balance for a specific holder of a specific bond.
     * @param bondId The identifier for the bond listing.
     * @param holder The address of the holder to query.
     * @return The balance according to marketplace analytics.
     */
    function getAnalyticsHolderBalance(
        uint256 bondId,
        address holder
    ) external view returns (uint256) {
        // Access the nested mapping directly within the contract
        return bondAnalytics[bondId].holderBalances[holder];
    }
}

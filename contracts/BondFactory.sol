// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import the TokenizedBond contract
import "./TokenizedBond.sol";
import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title BondFactory
 * @notice A contract that handles the creation of instances of tokenized bond by calling methods in TokenizedBond.sol
 */
contract BondFactory is ChainlinkClient, ConfirmedOwner {
    using Strings for uint256;
    using Chainlink for Chainlink.Request;
    bytes32 private jobId;
    uint256 private fee;
    address private oracle;
    event RequestPrice(bytes32 indexed requestId, uint256 price);
    uint256 public latestFetchedPrice;

    //------------------------------- State Variables ----------------------------------------//

    // metadata for each bond
    // some duplication with TokenizedBond.sol, can fix later
    struct BondRecord {
        address bondAddress;
        string name;
        string symbol;
        bool active;
        uint256 creationTimestamp;
        uint256 maturityDate;
        uint256 decommissionTimestamp;
        address issuer;
        uint256 faceValue;
        uint256 couponRate;
        uint256 maxBondSupply;
    }

    //Stre the market price via Chainlink
    mapping(uint256 => uint256) public bondIdToPrice;
    // Map requestId to bondId
    mapping(bytes32 => uint256) public requestIdToBondId;

    // Array of all bond addresses ever created
    address[] public allBonds;

    // Array of active bond addresses
    address[] public activeBonds;

    // Mapping from bond address the struct that contains its info
    mapping(address => BondRecord) public bondRegistry;

    // Mapping from issuer address to their bonds
    // mapping(address => address[]) public issuerToBonds;
    mapping(address => uint256[]) public issuerToBondIds;

    mapping(uint256 => address) public bondIdToAddress;

    //------------------------------- Events ----------------------------------------//

    // Emit a event that says a new bond has been tokenized
    event TokenizedBondCreated(
        address indexed bondAddress,
        string name,
        string symbol,
        address indexed issuer
    );

    // Emit a event that says a bond has been decommissioned
    event BondDecommissioned(
        address indexed bondAddress,
        string name,
        string symbol,
        uint256 timestamp
    );

    // Emit a event that says a bond has been modified
    event BondModified(
        address indexed bondAddress,
        uint256 couponRate,
        uint256 maturityDate,
        uint256 maxBondSupply,
        uint256 tokenPrice
    );

    /**
     * @notice Initialize the link token and target oracle
     * Sepolia Testnet details:
     * Link Token: 0x779877A7B0D9E8603169DdbD7836e478b4624789
     * Oracle: 0x6090149792dAAeE9D1D568c9f9a6F6B46AA29eFD (Chainlink DevRel)
     * Job ID: ca98366cc7314957b8c012c72f05aeeb
     */
    constructor() ConfirmedOwner(msg.sender) {
        _setChainlinkToken(0x779877A7B0D9E8603169DdbD7836e478b4624789);
        _setChainlinkOracle(0x6090149792dAAeE9D1D568c9f9a6F6B46AA29eFD);
        jobId = "ca98366cc7314957b8c012c72f05aeeb";
        fee = (1 * LINK_DIVISIBILITY) / 10; // 0.1 LINK
    }

    //------------------------------- Functions ----------------------------------------//

    /**
     *@notice Create a new TokenizedBond contract
     * @dev Create a new TokenizedBond contract
     * @param _name The name of the bond
     * @param _symbol The symbol of the bond
     * @param _id The unique identifier of the bond
     * @param _faceValue The face value of the bond
     * @param _couponRate The coupon rate of the bond
     * @param _couponFrequency The coupon frequency of the bond
     * @param _maturityDate The maturity date of the bond
     * @param _issuer The issuer of the bond
     * @param _stablecoinAddress The address of the stablecoin used to purchase the bond
     * @param _tokensPerBond The number of tokens per bond
     * @param _tokenPrice The token price or the unit price of the bond
     * @param _maxBondSupply The maximum supply of the bond
     * @return The address of the new TokenizedBond contract
     */
    function createTokenizedBond(
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
        uint256 _maxBondSupply
    ) public returns (address) {
        /**
            Create a new TokenizedBond contract by 
            calling the constructor in TokenizedBond.sol
         */

        uint256 initialSupply = _tokensPerBond * _maxBondSupply;
        TokenizedBond newBond = new TokenizedBond(
            _name,
            _symbol,
            _id,
            _faceValue,
            _couponRate,
            _couponFrequency,
            _maturityDate,
            _issuer,
            _stablecoinAddress,
            _tokensPerBond,
            _tokenPrice,
            _maxBondSupply,
            initialSupply
        );

        address bondAddress = address(newBond);

        BondRecord memory record = BondRecord({
            bondAddress: bondAddress,
            name: _name,
            symbol: _symbol,
            active: true,
            creationTimestamp: block.timestamp,
            maturityDate: _maturityDate,
            decommissionTimestamp: 0,
            issuer: _issuer,
            faceValue: _faceValue,
            couponRate: _couponRate,
            maxBondSupply: _maxBondSupply
        });

        // Update the tracking data
        bondRegistry[bondAddress] = record;
        allBonds.push(bondAddress);
        activeBonds.push(bondAddress);
        // issuerToBonds[_issuer].push(bondAddress);
        issuerToBondIds[_issuer].push(_id);
        bondIdToAddress[_id] = bondAddress;

        // Transfer ownership of the bond to the sender if they're the issuer
        if (msg.sender == _issuer) {
            newBond.transferOwnership(msg.sender);
        }

        // Emit the TokenizedBondCreated event
        emit TokenizedBondCreated(bondAddress, _name, _symbol, _issuer);

        // Update the bond price mapping
        updateBondPrice(_id, bondAddress);

        // Return the address of the new TokenizedBond contract
        return bondAddress;
    }

    /**
     * @notice Update the price mapping for a bond
     * @param bondId The unique identifier of the bond
     * @param bondAddress The address of the bond contract
     */
    function updateBondPrice(uint256 bondId, address bondAddress) internal {
        TokenizedBond bond = TokenizedBond(bondAddress);
        (uint256 tokensPerBond, uint256 tokenPrice, ) = bond.fractionInfo();
        bondIdToPrice[bondId] = tokenPrice * tokensPerBond;
    }

    /**
     * @notice Modify parameters of an existing TokenizedBond
     * @param bondAddress Address of the TokenizedBond contract to modify
     * @param _couponRate New coupon rate in basis points
     * @param _maturityDate New maturity date
     * @param _maxBondSupply New maximum bond supply
     * @param _tokenPrice New bond price
     */
    function modifyBond(
        address bondAddress,
        uint256 _couponRate,
        uint256 _maturityDate,
        uint256 _maxBondSupply,
        uint256 _tokenPrice
    ) public {
        // Ensure the bond exists and is active
        require(
            bondRegistry[bondAddress].active,
            "Bond is not active or doesn't exist"
        );

        TokenizedBond bond = TokenizedBond(bondAddress);

        // Call modifyBond on the TokenizedBond contract
        bond.modifyBond(
            _couponRate,
            _maturityDate,
            _maxBondSupply,
            _tokenPrice
        );

        // Update the registry data if values have changed
        BondRecord storage record = bondRegistry[bondAddress];

        // Only update if the value is legitimate, i.e. > 0
        if (_couponRate > 0) {
            record.couponRate = _couponRate;
        }

        if (_maturityDate > block.timestamp) {
            record.maturityDate = _maturityDate;
        }

        if (_maxBondSupply > 0) {
            record.maxBondSupply = _maxBondSupply;
        }

        updateBondPrice(bond.getBondId(), bondAddress);

        emit BondModified(
            bondAddress,
            _couponRate,
            _maturityDate,
            _maxBondSupply,
            _tokenPrice
        );
    }

    //------------------------------- View Functions ----------------------------------------//

    /**
     * @notice Get the most recently created bond address
     * @return Address of the most recently created bond
     */
    function getLatestBond() public view returns (address) {
        require(allBonds.length > 0, "No bonds created yet");
        return allBonds[allBonds.length - 1];
    }

    /**
     * @notice Get the most recently created bond ID by issuer
     * @param issuer Address of the issuer
     * @return ID of the most recently created bond by the issuer
     */
    function getLatestBondByIssuer(
        address issuer
    ) public view returns (uint256) {
        uint256[] storage issuerBonds = issuerToBondIds[issuer];
        require(issuerBonds.length > 0, "No bonds created by this issuer");
        return issuerBonds[issuerBonds.length - 1];
    }

    /**
     * @notice Get a bond address by its creation index
     * @param index Index in the creation sequence (0 = first created bond)
     * @return Address of the bond at the specified index
     */
    function getBondByIndex(uint256 index) public view returns (address) {
        require(index < allBonds.length, "Bond index out of bounds");
        return allBonds[index];
    }

    /**
     * @notice Get a bond ID and address by issuer and index
     * @param issuer Address of the issuer
     * @param index Index in the issuer's creation sequence
     * @return bondId The unique identifier of the bond
     * @return bondAddress Address of the bond at the specified index
     */
    function getIssuerBondByIndex(
        address issuer,
        uint256 index
    ) public view returns (uint256 bondId, address bondAddress) {
        require(
            index < issuerToBondIds[issuer].length,
            "Bond index out of bounds for issuer"
        );

        // Get the bond ID at the specified index
        bondId = issuerToBondIds[issuer][index];

        // Get the address mapped to this bond ID
        bondAddress = bondIdToAddress[bondId];

        return (bondId, bondAddress);
    }

    /**
     * @notice Get the price of a bond by its ID
     * @param bondId The unique identifier of the bond
     * @return The current price of the bond in stablecoin units
     */
    function getBondPricebyId(uint256 bondId) public view returns (uint256) {
        //require(allBonds.length > 0, "No bonds created yet");

        /*
        for (uint256 i = 0; i < allBonds.length; i++) {
            TokenizedBond bond = TokenizedBond(allBonds[i]);
            if (bond.getBondId() == bondId) {
                (uint256 tokensPerBond, uint256 tokenPrice, ) = bond
                    .fractionInfo();
                return tokenPrice * tokensPerBond;
            }
        }

        revert("Bond ID not found");*/
        return bondIdToPrice[bondId];
    }

    /*
    Request the latest market price via Chainlink, and store the results in bondIdToPrice
    Be noted that the request is async function, bondIdToPrice will only be upated by the callback function after a period of time.
    */
    function requestBondPrice(
        uint256 bondId
    ) public returns (bytes32 requestId) {
        Chainlink.Request memory req = _buildChainlinkRequest(
            jobId,
            address(this),
            this.fulfill.selector
        );

        req._add(
            "get",
            "https://script.google.com/macros/s/AKfycbwElKgGgW3nRNYSpCwKwsDu8Su-ojG6wtOHQAAWFkT-7wDA3RIz-q8hOVa-o875-7ogHQ/exec"
        );
        //req._add("path", string(abi.encodePacked(bondId)));
        req._add("path", bondId.toString());
        int256 timesAmount = 100;
        req._addInt("times", timesAmount);

        // Sends the request and get the requestId
        requestId = _sendChainlinkRequest(req, fee);

        // Map the requestId to the bondId
        requestIdToBondId[requestId] = bondId;

        return requestId;
    }

    /**
     * @notice Callback function called by Chainlink oracle to fulfill the request
     */
    function fulfill(
        bytes32 _requestId,
        uint256 _price
    ) public recordChainlinkFulfillment(_requestId) {
        emit RequestPrice(_requestId, _price);
        uint256 bondId = requestIdToBondId[_requestId];
        latestFetchedPrice = _price;
        bondIdToPrice[bondId] = _price;
    }

    /**
     * Allow withdraw of Link tokens from the contract
     */
    function withdrawLink() public onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(_chainlinkTokenAddress());
        require(
            link.transfer(msg.sender, link.balanceOf(address(this))),
            "Unable to transfer"
        );
    }

    /**
     * @notice Get a bond record by address
     * @param bondAddress Address of the bond
     * @return A BondRecord struct with the bond's details
     */
    function getBondRecord(
        address bondAddress
    ) public view returns (BondRecord memory) {
        require(
            bondRegistry[bondAddress].active ||
                bondRegistry[bondAddress].decommissionTimestamp > 0,
            "Bond does not exist"
        );
        return bondRegistry[bondAddress];
    }
    /**
     * @notice Get the number of all bonds ever created
     * @return Number of bonds
     */
    function getTotalBondCount() public view returns (uint256) {
        return allBonds.length;
    }

    /**
     * @notice Get the number of active bonds
     * @return Number of active bonds
     */
    function getActiveBondCount() public view returns (uint256) {
        return activeBonds.length;
    }

    /**
     * @notice Get all bond IDs created by a specific issuer
     * @param issuer Address of the issuer
     * @return Array of bond IDs created by the issuer
     * @dev This function returns the bond IDs associated with the issuer
     */
    function getBondsByIssuer(
        address issuer
    ) public view returns (uint256[] memory) {
        return issuerToBondIds[issuer];
    }

    /**
     * @notice Get count of bonds created by a specific issuer
     * @param issuer Address of the issuer
     * @return Number of bonds created by the issuer
     */
    function getIssuerBondCount(address issuer) public view returns (uint256) {
        return issuerToBondIds[issuer].length;
    }

    /**
     * @notice Get complete details of an active bond by its index in the activeBonds array
     * @param index Array index
     * @return bondAddress The address of the bond contract
     * @return name The name of the bond
     * @return symbol The symbol of the bond
     * @return bondId The unique identifier of the bond
     * @return faceValue The face value of the bond
     * @return couponRate The coupon rate of the bond
     * @return couponFrequency The coupon frequency of the bond
     * @return maturityDate The maturity date of the bond
     * @return issuer The issuer of the bond
     * @return stablecoinAddress The address of the stablecoin used for payments
     * @return tokensPerBond The number of tokens per bond
     * @return tokenPrice The price of each token
     * @return maxBondSupply The maximum supply of the bond
     * @return creationTimestamp When the bond was created
     */
    function getActiveBondDetailsByIndex(
        uint256 index
    )
        public
        view
        returns (
            address bondAddress,
            string memory name,
            string memory symbol,
            uint256 bondId,
            uint256 faceValue,
            uint256 couponRate,
            uint256 couponFrequency,
            uint256 maturityDate,
            address issuer,
            address stablecoinAddress,
            uint256 tokensPerBond,
            uint256 tokenPrice,
            uint256 maxBondSupply,
            uint256 creationTimestamp
        )
    {
        require(index < activeBonds.length, "Index out of bounds");
        address addr = activeBonds[index];
        BondRecord storage record = bondRegistry[addr];

        // Get the bond contract to retrieve additional parameters
        TokenizedBond bond = TokenizedBond(addr);
        uint256 id = bond.getBondId();
        uint256 couponFreq = bond.getCouponFrequency();
        address stablecoin = bond.getStablecoinAddress();
        (uint256 tokens, uint256 price, ) = bond.fractionInfo();

        // Return full details
        return (
            addr,
            record.name,
            record.symbol,
            id,
            record.faceValue,
            record.couponRate,
            couponFreq,
            record.maturityDate,
            record.issuer,
            stablecoin,
            tokens,
            price,
            record.maxBondSupply,
            record.creationTimestamp
        );
    }
    /**
     * @notice Get complete details of an active bond by its ID
     * @param bondId The unique identifier of the bond
     * @return bondAddress The address of the bond contract
     * @return name The name of the bond
     * @return symbol The symbol of the bond
     * @return returnBondId The unique identifier of the bond
     * @return faceValue The face value of the bond
     * @return couponRate The coupon rate of the bond
     * @return couponFrequency The coupon frequency of the bond
     * @return maturityDate The maturity date of the bond
     * @return issuer The issuer of the bond
     * @return stablecoinAddress The address of the stablecoin used for payments
     * @return tokensPerBond The number of tokens per bond
     * @return tokenPrice The price of each token
     * @return maxBondSupply The maximum supply of the bond
     * @return creationTimestamp When the bond was created
     */
    function getActiveBondDetailsByBondId(
        uint256 bondId
    )
        public
        view
        returns (
            address bondAddress,
            string memory name,
            string memory symbol,
            uint256 returnBondId, // renamed to avoid confusion
            uint256 faceValue,
            uint256 couponRate,
            uint256 couponFrequency,
            uint256 maturityDate,
            address issuer,
            address stablecoinAddress,
            uint256 tokensPerBond,
            uint256 tokenPrice,
            uint256 maxBondSupply,
            uint256 creationTimestamp
        )
    {
        // Find the bond contract with this ID
        address foundAddress = address(0);

        for (uint256 i = 0; i < activeBonds.length; i++) {
            TokenizedBond currentBond = TokenizedBond(activeBonds[i]);
            if (currentBond.getBondId() == bondId) {
                foundAddress = activeBonds[i];
                break;
            }
        }

        require(
            foundAddress != address(0),
            "Bond ID not found in active bonds"
        );

        BondRecord storage record = bondRegistry[foundAddress];
        TokenizedBond bond = TokenizedBond(foundAddress);

        // Get additional parameters from the bond contract
        uint256 couponFreq = bond.getCouponFrequency();
        (uint256 tokens, uint256 price, ) = bond.fractionInfo();
        address stablecoin = bond.getStablecoinAddress();

        // Return full details
        return (
            foundAddress,
            record.name,
            record.symbol,
            bondId,
            record.faceValue,
            record.couponRate,
            couponFreq,
            record.maturityDate,
            record.issuer,
            stablecoin,
            tokens,
            price,
            record.maxBondSupply,
            record.creationTimestamp
        );
    }

    /**
     * @notice Get complete details of a bond by its contract address
     * @param bondAddress Address of the bond contract
     * @return name The name of the bond
     * @return symbol The symbol of the bond
     * @return bondId The unique identifier of the bond
     * @return faceValue The face value of the bond
     * @return couponRate The coupon rate of the bond
     * @return couponFrequency The coupon frequency of the bond
     * @return maturityDate The maturity date of the bond
     * @return issuer The issuer of the bond
     * @return stablecoinAddress The address of the stablecoin used for payments
     * @return tokensPerBond The number of tokens per bond
     * @return tokenPrice The price of each token
     * @return maxBondSupply The maximum supply of the bond
     * @return creationTimestamp When the bond was created
     * @return isActive Whether the bond is currently active
     */
    function getBondDetailsByAddress(
        address bondAddress
    )
        public
        view
        returns (
            string memory name,
            string memory symbol,
            uint256 bondId,
            uint256 faceValue,
            uint256 couponRate,
            uint256 couponFrequency,
            uint256 maturityDate,
            address issuer,
            address stablecoinAddress,
            uint256 tokensPerBond,
            uint256 tokenPrice,
            uint256 maxBondSupply,
            uint256 creationTimestamp,
            bool isActive
        )
    {
        require(
            bondRegistry[bondAddress].bondAddress != address(0),
            "Bond does not exist"
        );

        BondRecord storage record = bondRegistry[bondAddress];
        TokenizedBond bond = TokenizedBond(bondAddress);

        // Get additional parameters from the bond contract
        uint256 id = bond.getBondId();
        uint256 couponFreq = bond.getCouponFrequency();
        (uint256 tokens, uint256 price, ) = bond.fractionInfo();
        address stablecoin = bond.getStablecoinAddress();

        // Return full details
        return (
            record.name,
            record.symbol,
            id,
            record.faceValue,
            record.couponRate,
            couponFreq,
            record.maturityDate,
            record.issuer,
            stablecoin,
            tokens,
            price,
            record.maxBondSupply,
            record.creationTimestamp,
            record.active
        );
    }

    /**
     * @notice Check if a bond is active
     * @param bondAddress Address of the bond
     * @return Whether the bond is active
     */
    function isBondActive(address bondAddress) public view returns (bool) {
        require(
            bondRegistry[bondAddress].bondAddress != address(0),
            "Bond does not exist"
        );
        return bondRegistry[bondAddress].active;
    }

    // ------------------------------- Bond Operations ----------------------------------------//

    /**
     * @notice Purchase bonds for an investor through the factory
     * @param bondAddress Address of the TokenizedBond
     * @param investor Address of the investor
     * @param bondAmount Number of bonds to purchase
     */
    function purchaseBonds(
        address bondAddress,
        address investor,
        uint256 bondAmount
    ) external {
        // require(bondRegistry[bondAddress].active, "Bond not active");
        TokenizedBond bond = TokenizedBond(bondAddress);
        bond.purchaseBondFor(investor, bondAmount);
    }

    /**
     * @notice Claim coupon payment for an investor through the factory
     * @param bondAddress Address of the TokenizedBond
     * @param investor Address of the investor
     */
    function claimCoupon(address bondAddress, address investor) external {
        // require(bondRegistry[bondAddress].active, "Bond not active");
        TokenizedBond bond = TokenizedBond(bondAddress);
        bond.claimCouponFor(investor);
    }

    /**
     * @notice Redeem bonds for an investor through the factory
     * @param bondAddress Address of the TokenizedBond
     * @param investor Address of the investor
     */
    function redeemBonds(address bondAddress, address investor) external {
        TokenizedBond bond = TokenizedBond(bondAddress);
        bond.redeemFor(investor);
    }

    // /**
    //  * @notice Add addresses to whitelist for a bond
    //  * @param bondAddress Address of the TokenizedBond
    //  * @param accounts Addresses to whitelist
    //  */
    // function addToWhitelist(
    //     address bondAddress,
    //     address[] calldata accounts
    // ) external {
    //     require(bondRegistry[bondAddress].active, "Bond not active");
    //     TokenizedBond bond = TokenizedBond(bondAddress);
    //     bond.addToWhitelist(accounts);
    // }

    // /**
    //  * @notice Set KYC status for accounts
    //  * @param bondAddress Address of the TokenizedBond
    //  * @param accounts Addresses to update
    //  * @param approved KYC approval status
    //  */
    // function setKycStatus(
    //     address bondAddress,
    //     address[] calldata accounts,
    //     bool approved
    // ) external {
    //     require(bondRegistry[bondAddress].active, "Bond not active");
    //     TokenizedBond bond = TokenizedBond(bondAddress);
    //     bond.setKycStatus(accounts, approved);
    // }

    /**
     * @notice Mint new bonds to the specified address
     * @param bondAddress Address of the TokenizedBond
     * @param to Recipient address
     * @param bondAmount Amount of bonds to mint
     */
    function mintBond(
        address bondAddress,
        address to,
        uint256 bondAmount
    ) external {
        // require(bondRegistry[bondAddress].active, "Bond not active");
        TokenizedBond bond = TokenizedBond(bondAddress);
        bond.mintBond(to, bondAmount);
    }

    /**
     * @notice Decommission a bond after all tokens have been redeemed
     * @dev Only the bond owner or issuer can decommission a bond
     * @param bondAddress Address of the TokenizedBond contract to decommission
     */
    function decommissionBond(address bondAddress) external {
        // Verify bond exists
        BondRecord storage record = bondRegistry[bondAddress];
        require(record.bondAddress != address(0), "Bond does not exist");
        require(record.active, "Bond is already decommissioned");

        // Get the bond contract
        TokenizedBond bond = TokenizedBond(bondAddress);

        // Verify caller is authorized (either bond owner or issuer)
        require(
            bond.owner() == msg.sender || record.issuer == msg.sender,
            "Only bond owner or issuer can decommission"
        );

        // Verify all tokens have been redeemed
        // require(
        //     bond.totalSupply() == 0,
        //     "Cannot decommission bond with outstanding tokens"
        // );

        // Update the bond record
        record.active = false;
        record.decommissionTimestamp = block.timestamp;

        // Remove from active bonds list
        for (uint256 i = 0; i < activeBonds.length; i++) {
            if (activeBonds[i] == bondAddress) {
                // Swap with the last element and then pop
                activeBonds[i] = activeBonds[activeBonds.length - 1];
                activeBonds.pop();
                break;
            }
        }

        // Emit decommission event
        emit BondDecommissioned(
            bondAddress,
            record.name,
            record.symbol,
            block.timestamp
        );
    }
}

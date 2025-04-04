// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import the TokenizedBond contract
import "./TokenizedBond.sol";
// Import Chainlink and OpenZeppelin libraries
import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/LinkTokenInterface.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title BondFactory
 * @notice A contract that handles bond creation/issuance, bond registry management, bond configuration and lifecycle management and some administrative operations
 */
contract BondFactory is ChainlinkClient, ConfirmedOwner {
    using Strings for uint256;
    using Chainlink for Chainlink.Request;

    //-------------------- State Variables & Structs --------------------//

    // --- Chainlink Oracle State ---
    bytes32 private jobId;
    uint256 private fee;
    address private oracle; // Chainlink Oracle address
    uint256 public latestFetchedPrice; // Last price fetched via Chainlink

    // Stores the market price fetched via Chainlink
    mapping(uint256 => uint256) public bondIdToPrice; // Renamed for clarity to represent fetched price
    // Map Chainlink requestId to bondId
    mapping(bytes32 => uint256) public requestIdToBondId;

    // --- Registry State ---

    // Minimal metadata stored in the factory for registry purposes.
    struct BondRecord {
        address bondAddress; // Address of the deployed TokenizedBond contract
        uint256 bondId; // The unique ID provided during creation
        address issuer; // Address designated as the issuer
        bool active; // Managed by the factory (true on creation, false on decommission)
        uint256 creationTimestamp; // Timestamp of creation in the factory
        uint256 decommissionTimestamp; // Timestamp of decommissioning in the factory
        // NOTE: name, symbol, maturity, faceValue, couponRate, etc., are NOT stored here anymore.
    }

    // --- Return Struct for Detailed Views ---
    struct BondDetails {
        // From Factory Record
        uint256 bondId;
        address issuer;
        uint256 creationTimestamp;
        bool isActive;
        uint256 decommissionTimestamp;
        // From TokenizedBond Contract
        string name;
        string symbol;
        uint256 faceValue;
        uint256 couponRate;
        uint256 couponFrequency;
        uint256 maturityDate;
        address stablecoinAddress;
        uint256 tokensPerBond;
        uint256 tokenPrice;
        uint256 maxBondSupply;
        uint256 maxOfferingSize;
        uint256 totalRaised;
        address bondAddress; // Added for convenience
    }

    // Array of all bond addresses ever created by this factory
    address[] public allBonds;

    // Array of currently active bond addresses managed by this factory
    address[] public activeBonds;

    // Mapping from bond address to its minimal record in the factory registry
    mapping(address => BondRecord) public bondRegistry;

    // Mapping from issuer address to the unique IDs of bonds they issued via this factory
    mapping(address => uint256[]) public issuerToBondIds;

    // Mapping from unique bond ID to the deployed bond contract address
    mapping(uint256 => address) public bondIdToAddress;

    //------------------------------- Events ----------------------------------------//
    // (Events remain the same)
    event TokenizedBondCreated(
        address indexed bondAddress,
        string name,
        string symbol,
        address indexed issuer
    );
    event BondDecommissioned(
        address indexed bondAddress,
        string name,
        string symbol,
        uint256 timestamp
    );
    event BondModified(
        address indexed bondAddress,
        uint256 couponRate,
        uint256 maturityDate,
        uint256 maxBondSupply,
        uint256 tokenPrice
    );
    event RequestPrice(bytes32 indexed requestId, uint256 price);

    //------------------------------- Constructor ----------------------------------------//

    constructor() ConfirmedOwner(msg.sender) {
        _setChainlinkToken(0x779877A7B0D9E8603169DdbD7836e478b4624789);
        _setChainlinkOracle(0x6090149792dAAeE9D1D568c9f9a6F6B46AA29eFD);
        jobId = "ca98366cc7314957b8c012c72f05aeeb";
        fee = (1 * LINK_DIVISIBILITY) / 10; // 0.1 LINK
    }

    //-------------------------- Core Factory Operations ---------------------------//
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
        uint256 _maxBondSupply,
        uint256 _maxOfferingSize
    ) public returns (address) {
        // --- Pre-checks ---
        require(_issuer != address(0), "Factory: Invalid issuer address");
        require(
            bondIdToAddress[_id] == address(0),
            "Factory: Bond ID already exists"
        );

        // --- Deploy TokenizedBond Contract ---
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
            _maxOfferingSize
        );

        address bondAddress = address(newBond);

        // --- Create Minimal Registry Record ---
        BondRecord memory record = BondRecord({
            bondAddress: bondAddress,
            bondId: _id,
            issuer: _issuer,
            active: true,
            creationTimestamp: block.timestamp,
            decommissionTimestamp: 0
            // NOTE : name, symbol, maturity, faceValue, couponRate, etc., are NOT stored here anymore
        });

        // --- Update Factory State ---
        bondRegistry[bondAddress] = record;
        allBonds.push(bondAddress);
        activeBonds.push(bondAddress);
        issuerToBondIds[_issuer].push(_id);
        bondIdToAddress[_id] = bondAddress;

        // --- Transfer Ownership ---
        newBond.transferOwnership(_issuer);

        // --- Emit TokenizedBondCreated Event ---
        string memory actualName = newBond.name();
        string memory actualSymbol = newBond.symbol();
        emit TokenizedBondCreated(
            bondAddress,
            actualName,
            actualSymbol,
            _issuer
        );

        return bondAddress;
    }

    /**
     * @notice Decommission a bond, marking it as inactive in the registry.
     * @dev This function can only be called by the bond owner or the original issuer.
     * @param bondAddress The address of the bond contract to decommission.
     */
    function decommissionBond(address bondAddress) external {
        BondRecord storage record = bondRegistry[bondAddress];
        require(
            record.bondAddress != address(0),
            "Factory: Bond does not exist in registry"
        );
        require(record.active, "Factory: Bond is already decommissioned");

        TokenizedBond bond = TokenizedBond(bondAddress);

        require(
            bond.owner() == msg.sender || record.issuer == msg.sender,
            "Factory: Caller is not bond owner or original issuer"
        );

        string memory bondName = bond.name();
        string memory bondSymbol = bond.symbol();

        record.active = false;
        record.decommissionTimestamp = block.timestamp;

        for (uint256 i = 0; i < activeBonds.length; i++) {
            if (activeBonds[i] == bondAddress) {
                activeBonds[i] = activeBonds[activeBonds.length - 1];
                activeBonds.pop();
                break;
            }
        }

        emit BondDecommissioned(
            bondAddress,
            bondName,
            bondSymbol,
            block.timestamp
        );
    }

    //---------------------- Chainlink Oracle Operations -----------------------//
    /**
     * @notice Request the bond price from an external API using Chainlink.
     * @dev This function constructs a Chainlink request and sends it to the oracle.
     * @param bondId The unique identifier of the bond for which the price is requested.
     * @return requestId The unique identifier for the Chainlink request.
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
            "https://script.google.com/macros/s/AKfycbwElKgGgW3nRNYSpCwKwsDu8Su-ojG6wtOHQAAWFkT-7wDA3RIz-q8hOVa-o875-7ogHQ/exec" // Example URL
        );
        req._add("path", bondId.toString()); // Example path parameter
        int256 timesAmount = 100; // Example modifier
        req._addInt("times", timesAmount);

        requestId = _sendChainlinkRequest(req, fee); // Uses internal oracle address

        requestIdToBondId[requestId] = bondId;

        return requestId;
    }

    /**
     * @notice Callback function for Chainlink to fulfill the bond price request.
     * @dev This function is called by Chainlink when the price is fetched.
     * @param _requestId The unique identifier for the Chainlink request.
     * @param _price The fetched bond price.
     */
    function fulfill(
        bytes32 _requestId,
        uint256 _price
    ) public recordChainlinkFulfillment(_requestId) {
        emit RequestPrice(_requestId, _price);
        uint256 bondId = requestIdToBondId[_requestId];
        if (bondId != 0) {
            latestFetchedPrice = _price;
            bondIdToPrice[bondId] = _price; // Store the fetched price
            delete requestIdToBondId[_requestId];
        }
    }

    /**
     * @notice Withdraw LINK tokens from the contract.
     */
    function withdrawLink() public onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(_chainlinkTokenAddress());
        require(
            link.transfer(msg.sender, link.balanceOf(address(this))),
            "Unable to transfer"
        );
    }

    //------------------- Basic Registry View Functions ---------------------//

    /**
     * @notice Get the bond record from the registry.
     * @param bondAddress The address of the bond contract.
     * @return record The BondRecord struct containing minimal information.
     */
    function getBondRecord(
        address bondAddress
    ) public view returns (BondRecord memory) {
        BondRecord storage record = bondRegistry[bondAddress];
        require(
            record.bondAddress != address(0) ||
                record.decommissionTimestamp > 0,
            "Factory: Bond address not found in registry"
        );
        return record;
    }

    /**
     * @notice Get the bond price by its ID.
     * @param bondId The unique identifier of the bond.
     * @return price The price of the bond.
     */
    function getBondPricebyId(uint256 bondId) public view returns (uint256) {
        return bondIdToPrice[bondId];
    }

    /**
     * @notice Get the bond issuance price by its ID.
     * @param bondId The unique identifier of the bond.
     * @return price The issuance price of the bond.
     */
    function getBondIssuancePrice(
        uint256 bondId
    ) public view returns (uint256 price) {
        address bondAddress = bondIdToAddress[bondId];
        if (bondAddress == address(0)) {
            return 0;
        }
        TokenizedBond bond = TokenizedBond(bondAddress);
        return bond.getBondPrice();
    }

    /**
     * @notice Get the total number of bonds created by this factory.
     * @return count The total number of bonds.
     */
    function getTotalBondCount() public view returns (uint256) {
        return allBonds.length;
    }

    /**
     * @notice Get the total number of active bonds managed by this factory.
     * @return count The total number of active bonds.
     */
    function getActiveBondCount() public view returns (uint256) {
        return activeBonds.length;
    }

    /**
     * @notice Get the total number of bonds created by a specific issuer.
     * @param issuer The address of the issuer.
     * @return count The total number of bonds created by the issuer.
     */
    function getBondsByIssuer(
        address issuer
    ) public view returns (uint256[] memory) {
        return issuerToBondIds[issuer];
    }

    /**
     * @notice Get the total number of bonds created by a specific issuer.
     * @param issuer The address of the issuer.
     * @return count The total number of bonds created by the issuer.
     */
    function getIssuerBondCount(address issuer) public view returns (uint256) {
        return issuerToBondIds[issuer].length;
    }

    /**
     * @notice Check if a bond is active.
     * @param bondAddress The address of the bond contract.
     * @return isActive True if the bond is active, false otherwise.
     */
    function isBondActive(address bondAddress) public view returns (bool) {
        return bondRegistry[bondAddress].active;
    }

    /**
     * @notice Get the latest bond created by this factory.
     * @return bondAddress The address of the latest bond.
     */
    function getLatestBond() public view returns (address) {
        require(allBonds.length > 0, "No bonds created yet");
        return allBonds[allBonds.length - 1];
    }

    /**
     * @notice Get the latest bond created by a specific issuer.
     * @param issuer The address of the issuer.
     * @return bondId The ID of the latest bond created by the issuer.
     */
    function getLatestBondByIssuer(
        address issuer
    ) public view returns (uint256) {
        uint256[] storage issuerBonds = issuerToBondIds[issuer];
        require(issuerBonds.length > 0, "No bonds created by this issuer");
        return issuerBonds[issuerBonds.length - 1];
    }

    /**
     * @notice Get the address of a bond by its index in the allBonds array.
     * @param index The index of the bond in the allBonds array.
     * @return bondAddress The address of the bond.
     */
    function getBondByIndex(uint256 index) public view returns (address) {
        require(index < allBonds.length, "Bond index out of bounds");
        return allBonds[index];
    }

    /**
     * @notice Get the address of a bond by its index in the activeBonds array.
     * @param index The index of the bond in the activeBonds array.
     * @param issuer The address of the issuer.
     * @return bondId The ID of the bond.
     * @return bondAddress The address of the bond.
     */
    function getIssuerBondByIndex(
        address issuer,
        uint256 index
    ) public view returns (uint256 bondId, address bondAddress) {
        uint256[] storage _issuerBondIds = issuerToBondIds[issuer]; // Use storage pointer
        require(
            index < _issuerBondIds.length,
            "Bond index out of bounds for issuer"
        );
        bondId = _issuerBondIds[index];
        bondAddress = bondIdToAddress[bondId];
        return (bondId, bondAddress);
    }

    //------------------- Detailed View Functions (Fetch On-Demand & Return Struct) ---------------------//

    /**
     * @notice Get complete details of an active bond by its ID.
     * @dev Finds address from ID, then fetches data via external calls. Returns a struct.
     * @param bondId The unique identifier of the bond.
     * @return details A BondDetails struct containing combined information.
     */
    function getActiveBondDetailsByBondId(
        uint256 bondId
    )
        public
        view
        returns (
            BondDetails memory details // FIX: Return the BondDetails struct
        )
    {
        address bondAddress = bondIdToAddress[bondId];
        require(
            bondAddress != address(0),
            "Factory: Bond ID not found in registry"
        );

        BondRecord storage record = bondRegistry[bondAddress];
        require(record.active, "Factory: Bond found but is not active");

        // Delegate fetching to the other function
        details = getBondDetailsByAddress(bondAddress);

        // The check for isActive happens implicitly within getBondDetailsByAddress
        // if needed, or can be re-verified here on the returned struct if desired.
        // require(details.isActive, "Factory: Inconsistency - bond marked inactive");

        return details; // Return the populated struct
    }

    /**
     * @notice Get complete details of a bond by its contract address.
     * @dev Fetches registry data from the factory and detailed parameters via external
     *      calls to the specified TokenizedBond contract. Returns a struct.
     *      Uses destructuring based on compiler errors indicating tuple returns.
     * @param bondAddress Address of the bond contract.
     * @return details A BondDetails struct containing combined information.
     */
    function getBondDetailsByAddress(
        address bondAddress
    )
        public
        view
        returns (
            BondDetails memory details // Return the BondDetails struct
        )
    {
        // 1. Fetch the minimal record stored in the factory registry
        BondRecord storage record = bondRegistry[bondAddress];
        require(
            record.bondAddress != address(0),
            "Factory: Bond address not found in registry"
        );

        // 2. Instantiate the target TokenizedBond contract
        TokenizedBond bond = TokenizedBond(bondAddress);

        // 3. Fetch data directly from the TokenizedBond contract

        // --- Fetch Basic ERC20/Direct Public Data ---
        details.name = bond.name(); // Standard ERC20 getter
        details.symbol = bond.symbol(); // Standard ERC20 getter
        details.stablecoinAddress = address(bond.stablecoin()); // Public getter for stablecoin address
        details.bondAddress = bondAddress; // Assign the address

        uint256 bInfo_bondId;
        address bInfo_issuer;
        uint256 bInfo_issueDate;
        uint256 bInfo_lastCouponPaymentDate;
        uint256 bInfo_totalCouponsPaid;
        uint256 bInfo_totalBondsMinted;
        string memory bInfo_name_unused;
        string memory bInfo_symbol_unused;

        (
            bInfo_name_unused, // name
            bInfo_symbol_unused, // symbol
            bInfo_bondId, // bondId
            bInfo_issuer, // issuer
            details.maxBondSupply, // maxBondSupply
            details.maturityDate, // maturityDate
            details.faceValue, // faceValue
            details.couponRate, // couponRate
            details.couponFrequency, // couponFrequency
            bInfo_issueDate, // issueDate
            bInfo_lastCouponPaymentDate, // lastCouponPaymentDate
            bInfo_totalCouponsPaid, // totalCouponsPaid
            bInfo_totalBondsMinted // totalBondsMinted
            // ^ Ensure this is exactly 13 variables in the correct order ^
        ) = bond.bondInfo(); // Assume compiler sees this returning 13 values

        // --- Unpack FractionalizationInfo using destructuring assignment (4 components expected by error) ---
        (
            details.tokensPerBond, // tokensPerBond
            details.tokenPrice, // tokenPrice
            details.totalRaised, // totalRaised
            details.maxOfferingSize // maxOfferingSize
            // ^ Ensure this is exactly 4 variables in the correct order ^
        ) = bond.fractionInfo(); // Assume compiler sees this returning 4 values

        // 4. Populate remaining fields in the details struct from Factory's BondRecord
        details.bondId = record.bondId; // Use ID from the factory's record
        details.issuer = record.issuer; // Use issuer from the factory's record
        details.creationTimestamp = record.creationTimestamp;
        details.isActive = record.active;
        details.decommissionTimestamp = record.decommissionTimestamp;

        // 5. Return the populated struct
        return details;
    }
}

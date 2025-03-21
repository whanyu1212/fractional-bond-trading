// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Import the TokenizedBond contract
import "./TokenizedBond.sol";

/**
 * @title BondFactory
 * @notice A contract that handles the creation of instances of tokenized bond by calling methods in TokenizedBond.sol
 */
contract BondFactory {
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

    // Array of all bond addresses ever created
    address[] public allBonds;

    // Array of active bond addresses
    address[] public activeBonds;

    // Mapping from bond address the struct that contains its info
    mapping(address => BondRecord) public bondRegistry;

    // Mapping from issuer address to their bonds
    mapping(address => address[]) public issuerToBonds;

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
        uint256 bondPrice
    );

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
     * @param _bondPrice The price of the bond
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
        uint256 _bondPrice,
        uint256 _maxBondSupply
    ) public returns (address) {
        /**
            Create a new TokenizedBond contract by 
            calling the constructor in TokenizedBond.sol
         */
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
            _bondPrice,
            _maxBondSupply
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
        issuerToBonds[_issuer].push(bondAddress);

        // Transfer ownership of the bond to the sender if they're the issuer
        if (msg.sender == _issuer) {
            newBond.transferOwnership(msg.sender);
        }

        // Emit the TokenizedBondCreated event
        emit TokenizedBondCreated(bondAddress, _name, _symbol, _issuer);

        // Return the address of the new TokenizedBond contract
        return bondAddress;
    }

    /**
     * @notice Modify parameters of an existing TokenizedBond
     * @param bondAddress Address of the TokenizedBond contract to modify
     * @param _couponRate New coupon rate in basis points
     * @param _maturityDate New maturity date
     * @param _maxBondSupply New maximum bond supply
     * @param _bondPrice New bond price
     */
    function modifyBond(
        address bondAddress,
        uint256 _couponRate,
        uint256 _maturityDate,
        uint256 _maxBondSupply,
        uint256 _bondPrice
    ) public {
        // Ensure the bond exists and is active
        require(
            bondRegistry[bondAddress].active,
            "Bond is not active or doesn't exist"
        );

        TokenizedBond bond = TokenizedBond(bondAddress);

        // Call modifyBond on the TokenizedBond contract
        bond.modifyBond(_couponRate, _maturityDate, _maxBondSupply, _bondPrice);

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

        emit BondModified(
            bondAddress,
            _couponRate,
            _maturityDate,
            _maxBondSupply,
            _bondPrice
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
     * @notice Get the most recently created bond by a specific issuer
     * @param issuer Address of the issuer
     * @return Address of the most recently created bond by the issuer
     */
    function getLatestBondByIssuer(
        address issuer
    ) public view returns (address) {
        address[] storage issuerBonds = issuerToBonds[issuer];
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
     * @notice Get a bond address by issuer and index
     * @param issuer Address of the issuer
     * @param index Index in the issuer's creation sequence
     * @return Address of the bond at the specified index
     */
    function getIssuerBondByIndex(
        address issuer,
        uint256 index
    ) public view returns (address) {
        require(
            index < issuerToBonds[issuer].length,
            "Bond index out of bounds for issuer"
        );
        return issuerToBonds[issuer][index];
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
     * @notice Get bonds created by a specific issuer
     * @param issuer Address of the issuer
     * @return Array of bond addresses created by the issuer
     */
    function getBondsByIssuer(
        address issuer
    ) public view returns (address[] memory) {
        return issuerToBonds[issuer];
    }

    /**
     * @notice Get count of bonds created by a specific issuer
     * @param issuer Address of the issuer
     * @return Number of bonds created by the issuer
     */
    function getIssuerBondCount(address issuer) public view returns (uint256) {
        return issuerToBonds[issuer].length;
    }

    /**
     * @notice Get details of an active bond by its index in the activeBonds array
     * @param index Array index
     * @return bondAddress The address of the bond contract
     * @return name The name of the bond
     * @return symbol The symbol of the bond
     * @return issuer The issuer of the bond
     * @return maturityDate The maturity date of the bond
     * @return faceValue The face value of the bond
     */
    function getActiveBondDetails(
        uint256 index
    )
        public
        view
        returns (
            address bondAddress,
            string memory name,
            string memory symbol,
            address issuer,
            uint256 maturityDate,
            uint256 faceValue
        )
    {
        require(index < activeBonds.length, "Index out of bounds");
        address addr = activeBonds[index];
        BondRecord storage record = bondRegistry[addr];

        return (
            addr,
            record.name,
            record.symbol,
            record.issuer,
            record.maturityDate,
            record.faceValue
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
        require(bondRegistry[bondAddress].active, "Bond not active");
        TokenizedBond bond = TokenizedBond(bondAddress);
        bond.purchaseBondFor(investor, bondAmount);
    }

    /**
     * @notice Claim coupon payment for an investor through the factory
     * @param bondAddress Address of the TokenizedBond
     * @param investor Address of the investor
     */
    function claimCoupon(address bondAddress, address investor) external {
        require(bondRegistry[bondAddress].active, "Bond not active");
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

    /**
     * @notice Add addresses to whitelist for a bond
     * @param bondAddress Address of the TokenizedBond
     * @param accounts Addresses to whitelist
     */
    function addToWhitelist(
        address bondAddress,
        address[] calldata accounts
    ) external {
        require(bondRegistry[bondAddress].active, "Bond not active");
        TokenizedBond bond = TokenizedBond(bondAddress);
        bond.addToWhitelist(accounts);
    }

    /**
     * @notice Set KYC status for accounts
     * @param bondAddress Address of the TokenizedBond
     * @param accounts Addresses to update
     * @param approved KYC approval status
     */
    function setKycStatus(
        address bondAddress,
        address[] calldata accounts,
        bool approved
    ) external {
        require(bondRegistry[bondAddress].active, "Bond not active");
        TokenizedBond bond = TokenizedBond(bondAddress);
        bond.setKycStatus(accounts, approved);
    }

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
        require(bondRegistry[bondAddress].active, "Bond not active");
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

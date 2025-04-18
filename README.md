<!-- omit in toc -->
# Blockchain-based fractional bond trading
![Total Commits](https://img.shields.io/github/commit-activity/t/whanyu1212/fractional-bond-trading?label=Total%20Commits&style=for-the-badge) ![Contributors](https://img.shields.io/github/contributors/whanyu1212/fractional-bond-trading?style=for-the-badge) ![Lines Changed](https://img.shields.io/github/commit-activity/m/whanyu1212/fractional-bond-trading?style=for-the-badge) ![Last Commit](https://img.shields.io/github/last-commit/whanyu1212/fractional-bond-trading?style=for-the-badge) ![Issues](https://img.shields.io/github/issues/whanyu1212/fractional-bond-trading?style=for-the-badge) ![Pull Requests](https://img.shields.io/github/issues-pr/whanyu1212/fractional-bond-trading?style=for-the-badge) ![Stars](https://img.shields.io/github/stars/whanyu1212/fractional-bond-trading?style=for-the-badge) ![License](https://img.shields.io/github/license/whanyu1212/fractional-bond-trading?style=for-the-badge)

A proof of concept implementation of a blockchain-based fractional bond trading platform

<!-- omit in toc -->
## Table of Contents
- [About the Project](#about-the-project)
- [Built With](#built-with)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Project Structure](#project-structure)
  - [Installation](#installation)
  - [Running the project](#running-the-project)
- [High Level Architecture](#high-level-architecture)
- [Smart Contract Overview](#smart-contract-overview)
  - [TokenizedBond Contract](#tokenizedbond-contract)
  - [BondFactory Contract](#bondfactory-contract)
  - [MockStableCoin Contract](#mockstablecoin-contract)
  - [BondMarketPlace Contract](#bondmarketplace-contract)
- [User Story](#user-story)
- [Roadmap](#roadmap)
- [Contributors](#contributors)
  
---
## About the Project
BondChain is a blockchain-based platform for fractional bond investment employing a hybrid model. It offers decentralized ownership and peer-to-peer exchange of tokenized bond shares (ERC20). However, platform setup, primary market functions facilitated by the BondMarketplace, and administrative control over individual bond parameters (by issuers via the TokenizedBond contract) introduce centralized control points necessary for orchestration, compliance, and lifecycle management.

---
## Built With
![Solidity](https://img.shields.io/badge/Solidity-%23363636.svg?style=for-the-badge&logo=solidity&logoColor=white) ![Next JS](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white) ![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E) ![Ethereum](https://img.shields.io/badge/Ethereum-3C3C3D?style=for-the-badge&logo=Ethereum&logoColor=white)


---

## Getting started

The following guide will help you set up and run the project locally.

### Prerequisites

- [Node.js](https://nodejs.org/en/) (LTS version is recommended)
- npm (comes with Node.js)

### Project Structure

The repository contains two main parts:

1. **Smart Contract / Backend Code:**  
   Located at the repository root. This part uses Hardhat for blockchain development.

2. **Next.js Frontend:**  
   Located in the `frontend` folder. This part is a Next.js application created with `npx create-next-app@latest`

### Installation

**1. Clone the Repository**

```bash
git clone https://github.com/whanyu1212/fractional-bond-trading.git
cd fractional-bond-trading
```
**2. Install Dependencies**

For the Root Project (Smart Contracts / Backend):
```bash
npm install
```

For the React Frontend:
```bash
cd frontend
npm install
cd ..
```

### Running the project

**1. Running the smart contract/backend**
```bash
npx hardhat compile
npx hardhat test
```

**2. Running the Next.js Frontend**
```bash
cd frontend
npm run dev # assuming it's not productionized
```

**3. Deploying contracts to testnet (Optional)**
```bash
npx hardhat run scripts/<file-name>.js --network sepolia
```
<br>

<u>Remark:</u> Make sure you sync the dependencies according to what are defined in `package.json` before running the project.

---

## High Level Architecture

```mermaid
flowchart LR
    subgraph Client["Client Side"]
        UI[Next.js Frontend]
        EJS[Ethers.js and Thirdweb]
        UI <--> EJS
    end

    subgraph Blockchain["Ethereum Network"]
        subgraph Contracts["Smart Contracts"]
            BF[BondFactory]
            TB[TokenizedBond]
            BM[BondMarketPlace]
            MS[MockStableCoin]
            
            BF -->|Creates| TB
            TB -->|Lists on| BM
            TB -->|Uses| MS
            BM -->|Interacts| TB
        end
    end

    User["User/Wallet (MetaMask)"]
    User -->|Connect/Actions| UI
    UI -->|Show Data| User
    UI -->|Prepare Tx| EJS
    User <-->|Sign/Confirm| EJS
    EJS -->|Submit| Blockchain
    Blockchain -->|Result| EJS
    EJS -->|Update| UI

    %% Styling
    classDef client fill:#e6f3ff,stroke:#333,stroke-width:2px
    classDef contracts fill:#f5f5f5,stroke:#333,stroke-width:2px
    classDef user fill:#f9f,stroke:#333,stroke-width:2px
    
    class UI,EJS client
    class BF,TB,BM,MS contracts
    class User user

    %% Container Styling
    style Client fill:#f5f9ff,stroke:#333,stroke-width:2px
    style Blockchain fill:#fff5f5,stroke:#333,stroke-width:2px
    style Contracts fill:#f5f5f5,stroke:#333,stroke-width:2px
```

---


## Smart Contract Overview


```mermaid
sequenceDiagram
    participant Deployer
    participant BondFactory
    participant BondMarketPlace
    participant TokenizedBond
    participant MockStableCoin
    participant Player

    %% Initial Setup
    Deployer->>MockStableCoin: deploy(name, symbol)
    Deployer->>BondFactory: deploy()
    Deployer->>BondMarketPlace: deploy()

    %% Bond Creation Flow
    Player->>BondFactory: createTokenizedBond(parameters)
    BondFactory->>TokenizedBond: deploy(parameters)
    BondFactory-->>TokenizedBond: transferOwnership(issuer)
    
    %% Listing Flow
    Player->>BondMarketPlace: listBond(bondId, bondAddress, price)
    BondMarketPlace-->>TokenizedBond: verify bond details

    %% Purchase Flow
    Note over Player,MockStableCoin: Purchase Process
    Player->>MockStableCoin: approve(bondAddress, amount)
    Player->>BondMarketPlace: purchaseBond(bondId, amount)
    BondMarketPlace->>TokenizedBond: purchaseBondFor(buyer, amount)
    TokenizedBond->>MockStableCoin: transferFrom(buyer, bondContract, cost)
    TokenizedBond-->>Player: mint(fractionalTokens)

    %% Coupon Payment Flow
    Note over Player,MockStableCoin: Coupon Claim
    Player->>BondMarketPlace: claimCoupon(bondId)
    BondMarketPlace->>TokenizedBond: claimCouponFor(claimer)
    TokenizedBond->>MockStableCoin: transfer(claimer, couponAmount)

    %% Trading Flow
    Note over Player,TokenizedBond: P2P Trading
    Player->>TokenizedBond: approve(bondAddress, tokenAmount)
    Player->>BondMarketPlace: exchangeBonds(bondId, from, to, tokenAmount, payment)
    BondMarketPlace->>TokenizedBond: exchangeBonds(from, to, tokenAmount, payment)
    TokenizedBond->>MockStableCoin: transferFrom(buyer, seller, payment)
    TokenizedBond-->>Player: transfer(tokenAmount)

    %% Redemption Flow
    Note over Player,MockStableCoin: Redemption
    Player->>BondMarketPlace: redeemBond(bondId)
    BondMarketPlace->>TokenizedBond: redeemFor(redeemer)
    TokenizedBond->>TokenizedBond: burn(bonds)
    TokenizedBond->>MockStableCoin: transfer(redeemer, redemptionAmount)
```
---

### TokenizedBond Contract

The `TokenizedBond` contract is an ERC20 token that represents a bond with a fixed coupon rate and maturity date. It inherits from OpenZeppelin's `ERC20` and `Ownable` contracts, providing token functionality and access control. The contract includes features for bond lifecycle management, fractional ownership, regulatory compliance (KYC and whitelisting), and financial safety.

<details>
<summary><strong>State Variables</strong></summary>

<u>Compliance and Security</u>

*   `DocumentInfo`: Struct containing:
    *   `documentURI`: URI to the legal document associated with the bond.
    *   `documentHash`: Hash of the legal document for verification.

<u>Bond Details</u>

*   `BondInfo`: Struct containing:
    *   `name`: Name of the bond.
    *   `symbol`: Symbol of the bond.
    *   `bondId`: Unique identifier for the bond.
    *   `issuer`: Address of the bond issuer.
    *   `maxBondSupply`: Maximum number of bonds that can be issued.
    *   `maturityDate`: UNIX timestamp for maturity.
    *   `faceValue`: Total principal amount of the bond.
    *   `couponRate`: Annual coupon rate (in basis points).
    *   `couponFrequency`: Number of coupon payments per year.
    *   `issueDate`: Date the bond was issued.
    *   `lastCouponPaymentDate`: Date of the last coupon payment.
    *   `totalCouponsPaid`: Total number of coupons paid.
    *   `totalBondsMinted`: Total number of bonds minted.

<u>Fractionalization</u>

*   `FractionalizationInfo`: Struct containing:
    *   `tokensPerBond`: Total ERC20 tokens representing one bond.
    *   `tokenPrice`: Price of one token in stablecoin.
    *   `totalRaised`: Total amount raised from bond sales.
    *   `maxOfferingSize`: Maximum amount of stablecoin to raise.

<u>Public Variables</u>

*   `bondInfo`: Public variable of type `BondInfo` storing the bond's details.
*   `fractionInfo`: Public variable of type `FractionalizationInfo` storing the fractionalization details.
*   `documentInfo`: Public variable of type `DocumentInfo` storing document details.
*   `lastClaimedCoupon`: Mapping of address to `uint256` storing the timestamp of the last coupon claimed by each holder.
*   `stablecoin`: Public variable of type `IERC20` representing the stablecoin used for payments.
*   `whitelist`: Mapping of address to `bool` indicating whether an address is whitelisted for transfers.
*   `kycApproved`: Mapping of address to `bool` indicating whether an address has passed KYC.
</details>

<br>

<details>
<summary><strong>Functions</strong></summary>

<u>Constructor</u>

*   `constructor(string memory _name, string memory _symbol, uint256 _id, uint256 _faceValue, uint256 _couponRate, uint256 _couponFrequency, uint256 _maturityDate, address _issuer, address _stablecoinAddress, uint256 _tokensPerBond, uint256 _tokenPrice, uint256 _maxBondSupply, uint256 _maxOfferingSize)`: Initializes the bond with the provided parameters, including bond details, fractionalization info, and the stablecoin address.

<u>External Functions</u>

*   `modifyBond(uint256 _couponRate, uint256 _maturityDate, uint256 _maxBondSupply, uint256 _tokenPrice, uint256 _maxOfferingSize)`: Modifies bond parameters. Owner only.
*   `mintBond(address to, uint256 bondAmount)`: Mints new bonds to a specified address. Owner only.
*   `purchaseBondFor(address buyer, uint256 bondAmount)`: Allows primary market purchase of bonds.
*   `claimCouponFor(address claimer)`: Claims coupon payments for a holder.
*   `batchClaimCoupons(address[] calldata claimers)`: Claims coupons for multiple holders.
*   `redeemFor(address redeemer)`: Redeems bonds after maturity.
*   `batchRedeemBonds(address[] calldata redeemers)`: Redeems bonds for multiple holders.
*   `exchangeBonds(address from, address to, uint256 tokenAmount, uint256 stablecoinAmount)`: Facilitates P2P bond trading/gifting.

<u>View Functions</u>

*   `getBondPrice()`: Returns bond price in stablecoin.
*   `getBondId()`: Returns bond ID.
*   `getCouponFrequency()`: Returns coupon payment frequency.
*   `getStablecoinAddress()`: Returns stablecoin contract address.
*   `getTokensPerBond()`: Returns tokens per bond ratio.
*   `verifyDocument(string calldata)`: Verifies document hash.

<u>Internal Functions</u>

*   `_beforeTokenTransfer(address from, address to, uint256 amount)`: Pre-transfer validation hook.
</details>

<br>

<details>
<summary><strong>Events</strong></summary>

*   `BondModified(uint256 couponRate, uint256 maturityDate, uint256 maxBondSupply, uint256 tokenPrice)`: Parameter updates.
*   `BondMinted(address indexed to, uint256 bondAmount, uint256 tokenAmount)`: New token minting.
*   `BondPurchased(address indexed buyer, uint256 bondAmount)`: Primary market purchases.
*   `CouponPaid(address indexed claimer, uint256 couponAmount)`: Coupon payments.
*   `BondRedeemed(address indexed redeemer, uint256 redemptionAmount)`: Redemptions.
*   `DocumentURIUpdated(string documentURI)`: Documentation URI updates.
*   `DocumentHashUpdated(bytes32 documentHash)`: Documentation hash updates.
*   `AddedToWhitelist(address indexed account)`: Whitelist additions.
*   `RemovedFromWhitelist(address indexed account)`: Whitelist removals.
*   `KycStatusChanged(address indexed account, bool approved)`: KYC status changes.
*   `BondTraded(address indexed from, address indexed to, uint256 tokenAmount, uint256 stablecoinAmount)`: P2P trades.
*   `BondGifted(address indexed from, address indexed to, uint256 tokenAmount)`: P2P gifts.
</details>

<br>

<details>
<summary><strong>Class Diagram</strong></summary>

```mermaid
classDiagram
    class TokenizedBond {
        +BondInfo public bondInfo
        +FractionalizationInfo public fractionInfo
        +DocumentInfo public documentInfo
        +IERC20 public stablecoin
        +mapping(address => uint256) lastClaimedCoupon
        +mapping(address => bool) whitelist
        +mapping(address => bool) kycApproved
        +constructor(name, symbol, id, faceValue, etc...)
        +modifyBond(couponRate, maturityDate, maxBondSupply, bondPrice)
        +mintBond(to, bondAmount)
        +purchaseBondFor(buyer, tokenAmount)
        +claimCouponFor(claimer)
        +redeemFor(redeemer)
        +swapBonds(from, to, tokenAmount, stablecoinAmount)
        +setKycStatus(accounts[], approved)
        +addToWhitelist(accounts[])
        +removeFromWhitelist(accounts[])
        +canTransfer(from, to)
    }

    class BondInfo {
        +string name
        +string symbol
        +uint256 bondId
        +address issuer
        +uint256 maxBondSupply
        +uint256 maturityDate
        +uint256 faceValue
        +uint256 couponRate
        +uint256 couponFrequency
        +uint256 issueDate
        +uint256 lastCouponPaymentDate
        +uint256 totalCouponsPaid
        +uint256 totalBondsMinted
    }

    class FractionalizationInfo {
        +uint256 tokensPerBond
        +uint256 tokenPrice
        +uint256 totalRaised
        +uint256 maxOfferingSize
    }

    class DocumentInfo {
        +string documentURI
        +bytes32 documentHash
    }

    class ERC20 {
        <<Interface>>
    }

    class Ownable {
        <<Interface>>
    }

    TokenizedBond --|> ERC20: inherits
    TokenizedBond --|> Ownable: inherits
    TokenizedBond o-- BondInfo: contains
    TokenizedBond o-- FractionalizationInfo: contains
    TokenizedBond o-- DocumentInfo: contains
```
</details>

---

### BondFactory Contract

The `BondFactory` contract manages the creation and lifecycle of `TokenizedBond` instances. It serves as a factory and registry, providing a centralized interface for interacting with multiple bond contracts. The contract implements Chainlink integration for real-time pricing data.

<details>
<summary><strong>State Variables</strong></summary>

<u>Chainlink Oracle State</u>

* `jobId`: ID of the Chainlink job for price queries
* `fee`: Fee paid for Chainlink requests
* `oracle`: Address of the Chainlink oracle
* `latestFetchedPrice`: Most recently fetched price from Chainlink
* `bondIdToPrice`: Maps bond ID to its current price
* `requestIdToBondId`: Maps Chainlink request IDs to bond IDs

<u>Registry State</u>

* `BondRecord`: Struct containing minimal metadata:
  * `bondAddress`: Address of the deployed TokenizedBond contract
  * `bondId`: The unique ID provided during creation
  * `issuer`: Address designated as the issuer
  * `active`: Managed by the factory (true on creation, false on decommission)
  * `creationTimestamp`: Timestamp of creation in the factory
  * `decommissionTimestamp`: Timestamp of decommissioning in the factory

* `BondDetails`: Extended struct for detailed views containing:
  * Factory Record fields (bondId, issuer, timestamps, etc.)
  * TokenizedBond Contract fields (name, symbol, face value, etc.)
  * Current state (totalRaised, isActive, etc.)

<u>Storage Mappings & Arrays</u>

* `allBonds`: Array of all bond addresses ever created
* `activeBonds`: Array of currently active bond addresses
* `bondRegistry`: Maps bond address to its BondRecord
* `issuerToBondIds`: Maps issuer address to their bond IDs
* `bondIdToAddress`: Maps unique bond ID to contract address

</details>

<br>

<details>
<summary><strong>Functions</strong></summary>

<u>Constructor</u>

* `constructor()`: Initializes Chainlink configuration for Sepolia testnet

<u>Core Factory Operations</u>

* `createTokenizedBond(...)`: Creates new TokenizedBond contract with specified parameters
* `decommissionBond(address bondAddress)`: Marks a bond as inactive in registry

<u>Chainlink Oracle Operations</u>

* `requestBondPrice(uint256 bondId)`: Requests price update via Chainlink
* `fulfill(bytes32 _requestId, uint256 _price)`: Callback for Chainlink price updates
* `withdrawLink()`: Allows owner to withdraw LINK tokens

<u>Basic Registry Views</u>

* `getBondRecord(address)`: Returns basic bond registry information
* `getBondPricebyId(uint256)`: Returns latest Chainlink price for bond
* `getBondIssuancePrice(uint256)`: Returns initial issuance price
* `getTotalBondCount()`: Returns total bonds created
* `getActiveBondCount()`: Returns number of active bonds
* `getBondsByIssuer(address)`: Returns all bonds by issuer
* `isBondActive(address)`: Checks if bond is active
* `getLatestBond()`: Returns most recent bond address
* `getBondByIndex(uint256)`: Returns bond address by index

<u>Detailed View Functions</u>

* `getActiveBondDetailsByBondId(uint256)`: Returns complete bond details by ID
* `getBondDetailsByAddress(address)`: Returns complete bond details by address

</details>

<br>

<details>
<summary><strong>Events</strong></summary>

* `TokenizedBondCreated(address indexed bondAddress, string name, string symbol, address indexed issuer)`
* `BondDecommissioned(address indexed bondAddress, string name, string symbol, uint256 timestamp)`
* `BondModified(address indexed bondAddress, uint256 couponRate, uint256 maturityDate, uint256 maxBondSupply, uint256 tokenPrice)`
* `RequestPrice(bytes32 indexed requestId, uint256 price)`

</details>

<br>

<details>
<summary><strong>Class Diagram</strong></summary>

```mermaid
classDiagram
    class BondFactory {
        +bytes32 private jobId
        +uint256 private fee
        +address private oracle
        +uint256 public latestFetchedPrice
        +mapping(uint256 => uint256) bondIdToPrice
        +mapping(bytes32 => uint256) requestIdToBondId
        +address[] public allBonds
        +address[] public activeBonds
        +mapping(address => BondRecord) bondRegistry
        +mapping(address => uint256[]) issuerToBondIds
        +mapping(uint256 => address) bondIdToAddress
        +constructor()
        +createTokenizedBond(...)
        +decommissionBond(address)
        +requestBondPrice(uint256)
        +fulfill(bytes32, uint256)
        +getBondDetailsByAddress(address)
    }

    class ChainlinkClient {
        <<Interface>>
    }

    class ConfirmedOwner {
        <<Interface>>
    }

    class TokenizedBond {
        <<External>>
    }

    BondFactory --|> ChainlinkClient : inherits
    BondFactory --|> ConfirmedOwner : inherits
    BondFactory ..> TokenizedBond : creates
```
</details>

---
### MockStableCoin Contract

The `MockStableCoin` contract is a simple ERC20 token implementation designed to simulate a stablecoin like USDC for testing purposes. It inherits from OpenZeppelin's `ERC20` and `Ownable` contracts, providing standard token functionality and access control.

<details>
<summary><strong>State Variables</strong></summary>

* `_decimals`: Private variable set to 6 to match USDC's decimal places.
</details>

<br>

<details>
<summary><strong>Functions</strong></summary>

<u>Constructor</u>

* `constructor(string memory name, string memory symbol)`: Initializes the stablecoin with the provided name and symbol, setting the deployer as the owner.

<u>Token Operations</u>

* `mint(address to, uint256 amount)`: Creates new tokens and assigns them to the specified address. This function is publicly accessible for testing purposes.

<u>View Functions</u>

* `decimals() returns (uint8)`: Overrides the standard ERC20 decimals function to return 6, matching USDC's decimal places instead of the default 18.
</details>

<br>

<details>
<summary><strong>Inherited Functionality</strong></summary>

<u>From ERC20</u>

* Standard token functions like `transfer`, `approve`, `transferFrom`, `balanceOf`, `allowance`, etc.

<u>From Ownable</u>

* Access control functions like `owner`, `transferOwnership`, `renounceOwnership`.
* Modifier `onlyOwner` for restricting function access.
</details>

<br>

<details>
<summary><strong>Class Diagram</strong></summary>

```mermaid
classDiagram
    class MockStablecoin {
        -uint8 _decimals
        +constructor(name, symbol)
        +mint(to, amount)
        +decimals() returns(uint8)
    }

    class ERC20 {
        <<Interface>>
    }

    class Ownable {
        <<Interface>>
    }

    MockStablecoin --|> ERC20: inherits
    MockStablecoin --|> Ownable: inherits
```
</details>

---

### BondMarketPlace Contract

The `BondMarketPlace` contract provides a marketplace for listing, trading, and managing tokenized bonds. It serves as a central hub for bond trading, offering features like bond listings, price tracking, market analytics, and batch operations for coupon claims and redemptions.

<details>
<summary><strong>State Variables</strong></summary>

<u>Listing Structure</u>

* `BondListing`: Struct containing:
  * `bondContract`: Reference to the ITokenizedBond contract
  * `issuer`: Address of bond issuer
  * `listingPrice`: Current listing price
  * `isListed`: Active listing status
  * `listingTime`: Initial listing timestamp
  * `matured`: Bond maturity status
  * `holders`: Historical holders array

<u>Analytics Structure</u>

* `MarketAnalytics`: Struct containing:
  * `lastTradePrice`: Last price traded at
  * `totalTradingVolume`: Cumulative trading volume
  * `historicalPrices`: Array of historical trade prices
  * `tradingTimes`: Array of trade timestamps
  * `numberOfTrades`: Total trade count
  * `holderBalances`: Maps holder address to token balance
  * `averageHoldingTime`: Average holding duration
  * `totalValueLocked`: Total value in bond

<u>Registry Mappings</u>

* `bondListings`: Maps bondId to BondListing
* `bondAnalytics`: Maps bondId to MarketAnalytics
* `totalListedBonds`: Count of listed bonds
* `totalTradingVolume`: Global trading volume
* `userTradingVolume`: Maps user address to their trading volume
* `userBondCount`: Maps user address to number of bonds held

</details>

<br>

<details>
<summary><strong>Functions</strong></summary>

<u>Listing Management</u>

* `listBond(uint256 bondId, ITokenizedBond bondAddress, uint256 price)`: Creates new bond listing
* `modifyListing(uint256 bondId, uint256 newPrice)`: Updates listing price
* `delistBond(uint256 bondId)`: Removes bond listing
* `updateBondMaturity(uint256 bondId, bool matured)`: Updates bond maturity status

<u>Trading Operations</u>

* `purchaseBond(uint256 bondId, uint256 bondAmount)`: Purchases bonds from primary market
* `exchangeBonds(uint256 bondId, address from, address to, uint256 tokenAmount, uint256 stablecoinAmount)`: Facilitates P2P trading

<u>Coupon Management</u>

* `claimCoupon(uint256 bondId)`: Claims coupon for single holder
* `batchClaimCoupons(uint256 bondId, address[] calldata claimers)`: Claims coupons for multiple holders
* `multiClaimCoupons(uint256[] calldata bondIds, address[][] calldata claimers)`: Claims coupons across multiple bonds

<u>Redemption Operations</u>

* `redeemBond(uint256 bondId)`: Redeems matured bonds
* `batchRedeemBonds(uint256 bondId, address[] calldata redeemers)`: Redeems for multiple holders
* `multiRedeemBonds(uint256[] calldata bondIds, address[][] calldata redeemers)`: Redeems across multiple bonds

<u>Analytics & View Functions</u>

* `getBondInfo(uint256 bondId)`: Returns basic listing information
* `getBondMarketMetrics(uint256 bondId)`: Returns market performance metrics
* `getUserMetrics(address user)`: Returns user trading statistics
* `getActualUserHoldingsWithDetails(address user)`: Returns detailed bond holdings
* `getAnalyticsHolderBalance(uint256 bondId, address holder)`: Returns marketplace-tracked balance

</details>

<br>

<details>
<summary><strong>Events</strong></summary>

* `BondListed(uint256 indexed bondId, address indexed issuer, uint256 price)`
* `BondDelisted(uint256 indexed bondId, address indexed delister)`
* `BondPurchaseRecorded(uint256 indexed bondId, address indexed buyer, uint256 amount)`
* `BondMaturityUpdated(uint256 indexed bondId, bool matured)`
* `BondRedemptionRecorded(uint256 indexed bondId, address indexed holder, uint256 amount)`
* `BondExchanged(uint256 indexed bondId, address indexed from, address indexed to, uint256 tokenAmount, uint256 stablecoinAmount)`
* `BondGifted(uint256 indexed bondId, address indexed from, address indexed to, uint256 tokenAmount)`

</details>

<br>

<details>
<summary><strong>Class Diagram</strong></summary>

```mermaid
classDiagram
    class BondMarketPlace {
        +mapping(uint256 => BondListing) bondListings
        +mapping(uint256 => MarketAnalytics) bondAnalytics
        +uint256 totalListedBonds
        +uint256 totalTradingVolume
        +mapping(address => uint256) userTradingVolume
        +mapping(address => uint256) userBondCount
        +listBond(uint256, ITokenizedBond, uint256)
        +purchaseBond(uint256, uint256)
        +exchangeBonds(uint256, address, address, uint256, uint256)
        +claimCoupon(uint256)
        +redeemBond(uint256)
        +getBondMarketMetrics(uint256)
        +getUserMetrics(address)
    }

    class BondListing {
        +ITokenizedBond bondContract
        +address issuer
        +uint256 listingPrice
        +bool isListed
        +uint256 listingTime
        +bool matured
        +address[] holders
    }

    class MarketAnalytics {
        +uint256 lastTradePrice
        +uint256 totalTradingVolume
        +uint256[] historicalPrices
        +uint256[] tradingTimes
        +uint256 numberOfTrades
        +mapping(address => uint256) holderBalances
        +uint256 averageHoldingTime
        +uint256 totalValueLocked
    }

    class Ownable {
        <<Interface>>
    }

    BondMarketPlace --|> Ownable : inherits
    BondMarketPlace o-- BondListing : contains
    BondMarketPlace o-- MarketAnalytics : contains
```
</details>

---

## User Story
- The `Deployer` (has significant administrative power) establishes the platform by deploying the core contracts onto the network (locally or onto Sepolia): `MockStablecoin` (BCC) for payments, `BondFactory` for managing bond instances' lifecycle, and `BondMarketplace` for listings and user interactions.
- To simplify the simulation process, the `Deployer` mints a generous amount of mockstablecoins to each participants to ensure that they have enough to fund the tokenizedbond as issuers as well as buying other people's bonds.
- Each participant (Issuer) then transfers the required funding amount of MockStablecoin into their respective TokenizedBond contract addresses, collateralizing them for future payouts.
- The participants can list their bonds on the marketplace by calling the `listBond` function in the `BondMarketPlace` contract.
- Before purchase events happen, the buyer needs to calculate the expected the cost which is tokenAmount * tokenPrice and grant permission (ERC20 approve) to the target TokenizedBond contract address, allowing it to withdraw this calculated cost in MockStablecoin for the purchase to go through.
- The `BondMarketPlace`'s wrapper purchase function will delegate the execution to TokenizedBond.purchaseFor(Address, Amount) to complete the execution
- Other functionalities such as claim, redeem and exchange between participants can also be called via the `BondMarketPlace` interface (though they are also wrappers afterall)
```mermaid
flowchart LR
    subgraph Platform["<font size=6>Fractional Bond Trading</font>"]
        direction LR
        subgraph "System Deployment"
            D1[Admin] -->|Deploys| D2["Core Contracts
            1. MockStableCoin
            2. BondFactory
            3. BondMarketplace"]
            D2 -->|Creates| D3["Bond Instance
            • Set Parameters
            • Fund Contract"]
            D3 <-->|Lists/Updates| D4[Initial and Continuous Offerings]
        end

        subgraph "Investment"
            A[Investor] -->|Browses| B[Bond Marketplace]
            B -->|Reviews| C["Bond Details
            • Price
            • Coupon Rate
            • Maturity Date"]
            C -->|Approves| E["Stablecoin Spend
            to TokenizedBond"]
            E -->|Executes| F[Purchase via
            Marketplace]
        end

        subgraph "Holding Period"
            F -->|Holds| G[Position]
            G -->|Regular| H[Claim Coupons]
            G -->|Optional| I[Secondary Market]
            
            I -->|Trade| J["P2P Exchange
            4. Approve Tokens
            5. Set Price
            6. Execute"]
            
            I -->|Gift| K["Gift Transfer
            7. Approve Tokens
            8. Execute"]
        end

        subgraph "Maturity"
            H & J & K -->|Until| N[Bond Matures]
            N -->|Redeem| P[Final Payment]
        end
    end

    D4 --> B

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style D1 fill:#f9f,stroke:#333,stroke-width:2px
    style N fill:#bbf,stroke:#333,stroke-width:2px
    style P fill:#bfb,stroke:#333,stroke-width:2px
    
    classDef optional fill:#f96,stroke:#333,stroke-width:1px
    class I,J,K optional
    classDef deployment fill:#e6fff2,stroke:#333,stroke-width:1px
    class D1,D2,D3,D4 deployment

    %% Remove coloring from Platform wrapper
    style Platform fill:none
```
---

## Roadmap
- [x] Smart Contract Development
- [x] Frontend Development
- [x] Testnet Deployment (Sepolia)
- [x] Presentation slides using slidev
- [ ] Improve unit test coverage
- [ ] Functionalities for depositing
- [ ] Deployment of rebalancing API
- [ ] Realistic pricing data feed via Chainlink
---

## Contributors
Disclaimer: The charts below are updated manually for now without setting up github actions.

<table>
  <tr>
    <td align="center">
      <a href="https://github.com/whanyu1212">
        <img src="https://avatars.githubusercontent.com/u/107110503?v=4" width="100px;" alt="Hanyu"/>
        <br />
        <sub><b>Wu Hanyu</b></sub>
      </a>
      <br />
      <sub>Smart Contract Development</sub>
    </td>
    <td align="center">
      <a href="https://github.com/KidultXy">
        <img src="https://avatars.githubusercontent.com/u/74521938?v=4" width="100px;" alt="Xu Yi"/>
        <br />
        <sub><b>Xu Yi</b></sub>
      </a>
      <br />
      <sub>Frontend Development</sub>
    </td>
    <td align="center">
      <a href="https://github.com/BB1101">
        <img src="https://avatars.githubusercontent.com/u/91317427?v=4" width="100px;" alt="Zhou Runbing"/>
        <br />
        <sub><b>Zhou Runbing</b></sub>
      </a>
      <br />
      <sub>Front End Development</sub>
    </td>
    <td align="center">
      <a href="https://github.com/chen-j06">
        <img src="https://avatars.githubusercontent.com/u/4729824?v=4" width="100px;" alt="Chen Ju"/>
        <br />
        <sub><b>Chen Ju</b></sub>
      </a>
      <br />
      <sub>Smart Contract Development</sub>
    </td>
  </tr>
</table>



<div style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: center;">
  <div style="flex: 1; min-width: 450px;">
    <h3>Commit Distribution</h3>
    <img src="https://quickchart.io/chart?c={type:'bar',data:{labels:['whanyu1212','BB1101','KidultXy','chen-j06'],datasets:[{label:'Commits',backgroundColor:'rgba(54,162,235,0.8)',data:[76,17,7,6]}]},options:{plugins:{title:{display:true,text:'Repository Commits by Contributor'},legend:{display:false}},scales:{y:{beginAtZero:true}}}}" width="100%" alt="Commit Distribution" />
  </div>
  <div style="flex: 1; min-width: 450px;">
    <h3>Lines Changed</h3>
    <img src="https://quickchart.io/chart?c={type:'bar',data:{labels:['whanyu1212','KidultXy','BB1101','chen-j06'],datasets:[{label:'Lines Added',backgroundColor:'rgba(75,192,192,0.8)',data:[40082,42856,2480,2781]},{label:'Lines Deleted',backgroundColor:'rgba(255,99,132,0.8)',data:[20603,19640,365,198]}]},options:{plugins:{title:{display:true,text:'Code Changes by Contributor'}},scales:{y:{beginAtZero:true}}}}" width="100%" alt="Lines Changed" />
  </div>
</div>
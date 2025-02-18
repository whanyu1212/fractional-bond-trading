# Blockchain-based fractional bond trading
A proof of concept implementation of a blockchain-based fractional bond trading platform


### Setup Guide for Fractional Bond Trading

This guide will help you set up and run the project locally.

#### Prerequisites

- [Node.js](https://nodejs.org/en/) (LTS version is recommended)
- npm (comes with Node.js)

#### Project Structure

The repository contains two main parts:

1. **Smart Contract / Backend Code:**  
   Located at the repository root. This part uses Hardhat for blockchain development.

2. **React Frontend:**  
   Located in the `interface` folder. This part is a React application created with Create React App.

#### Installation

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
cd interface
npm install
cd ..
```

#### Running the project

**1. Running the smart contract/backend**
```bash
npx hardhat compile
npx hardhat test
```

**2. Running the React Frontend**
```bash
cd interface
npm start
```
<br>

<u>Remark:</u> Both the root and the React frontend have their own node_modules folders. Make sure you run ```npm install``` in both locations before starting development.

<br>

#### Implementation Logic
<details>
   <summary>Purchase of Bond via Stablecoin</summary>

   ```
Deployer (User)                 Contracts
+----------------+             +-------------------+
|                |             | MockStablecoin    |
| Address:       |             | Address:          |
| deployer       |             | mockStablecoin    |
|                |             |                   |
| Has:           |   pays      | Mints USDC        |
| - USDC         | --------→   |                   |
| - Bond Tokens  |   950 USDC  |                   |
+----------------+             +-------------------+
        ↑                              ↑
        |                              |
        |                      +-------------------+
        |                      | TokenizedBond     |
        |          mints       | Address:          |
        +--------------------  | tokenizedBond     |
           1000 bond tokens    |                   |
                               | Holds: USDC       |
                               +-------------------+
```

</details>

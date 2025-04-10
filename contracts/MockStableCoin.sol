// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Using ERC20 from OpenZeppelin as the base
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// Using Ownable from OpenZeppelin to restrict access to certain functions
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockStablecoin is ERC20, Ownable {
    uint8 private _decimals = 6; // USDC has 6 decimals

    constructor(
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) Ownable(msg.sender) {}

    /**
     * @dev Mint new tokens
     * @param to The address to which the tokens will be minted
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    /**
     * @dev Override decimals to return the number of decimals that the stablecoin has, which is 6 in this example
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
}

pragma solidity ^0.5.4;

import "../token/JRC223.sol";

contract JRC223Mock is JRC223 {
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals,
        address initialAccount,
        uint256 initialBalance) 
        public 
    {
        _name = name;
        _symbol = symbol;
        _decimals = decimals;
        _balances[initialAccount] = initialBalance;
        _totalSupply = initialBalance;
    }
}

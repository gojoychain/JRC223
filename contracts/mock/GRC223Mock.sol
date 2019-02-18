pragma solidity ^0.5.4;

import "../token/GRC223.sol";

contract GRC223Mock is GRC223 {
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

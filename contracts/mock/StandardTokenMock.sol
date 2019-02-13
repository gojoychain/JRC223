pragma solidity ^0.5.2;

import "../token/StandardToken.sol";

contract StandardTokenMock is StandardToken {
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

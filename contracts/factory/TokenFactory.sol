pragma solidity ^0.5.2;

import "../token/PreMintedToken.sol";

contract TokenFactory {
    event PreMintedTokenCreated(
        address indexed tokenAddress,
        string name,
        string symbol,
        uint8 decimals,
        uint256 totalSupply,
        address owner
    );

    function createPreMintedToken(
        string name,
        string symbol,
        uint8 decimals,
        uint256 totalSupply,
        address owner)
        external
        returns (PreMintedToken preMintToken)
    {
        PreMintedToken token = new PreMintedToken(name, symbol, decimals, totalSupply, owner);
        emit PreMintedTokenCreated(address(token), name, symbol, decimals, totalSupply, owner);
        return token;
    }
}

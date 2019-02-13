pragma solidity ^0.5.2;

import "../token/GRC223PreMinted.sol";

contract TokenFactory {
    event GRC223PreMintedCreated(
        address indexed tokenAddress,
        string name,
        string symbol,
        uint8 decimals,
        uint256 totalSupply,
        address owner
    );

    function createGRC223PreMinted(
        string calldata name,
        string calldata symbol,
        uint8 decimals,
        uint256 totalSupply,
        address owner)
        external
        returns (GRC223PreMinted preMintToken)
    {
        GRC223PreMinted token = new GRC223PreMinted(name, symbol, decimals, totalSupply, owner);
        emit GRC223PreMintedCreated(address(token), name, symbol, decimals, totalSupply, owner);
        return token;
    }
}

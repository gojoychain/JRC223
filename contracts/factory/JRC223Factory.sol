pragma solidity ^0.5.4;

import "../token/JRC223PreMinted.sol";

contract JRC223Factory {
    event JRC223PreMintedCreated(
        address indexed tokenAddress,
        string name,
        string symbol,
        uint8 decimals,
        uint256 totalSupply,
        address owner
    );

    function createJRC223PreMinted(
        string calldata name,
        string calldata symbol,
        uint8 decimals,
        uint256 totalSupply,
        address owner)
        external
        returns (JRC223PreMinted tokenAddress)
    {
        JRC223PreMinted token = new JRC223PreMinted(name, symbol, decimals, totalSupply, owner);
        emit JRC223PreMintedCreated(address(token), name, symbol, decimals, totalSupply, owner);
        return token;
    }
}

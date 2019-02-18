pragma solidity ^0.5.4;

/// @title GRC223 receiver interface
contract GRC223Receiver { 
    /// @dev Standard GRC223 function that will handle incoming token transfers.
    /// @param from Token sender address.
    /// @param amount Amount of tokens.
    /// @param data Transaction metadata.
    function tokenFallback(address from, uint amount, bytes calldata data) external;
}

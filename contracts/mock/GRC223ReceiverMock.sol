pragma solidity ^0.5.2;

import "../token/GRC223Receiver.sol";

contract GRC223ReceiverMock is GRC223Receiver {
    bool public tokenFallbackExec;

    function tokenFallback(address from, uint amount, bytes data) external {
        tokenFallbackExec = true;
    }
}

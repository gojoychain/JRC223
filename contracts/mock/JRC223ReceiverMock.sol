pragma solidity ^0.5.4;

import "../token/JRC223Receiver.sol";

contract JRC223ReceiverMock is JRC223Receiver {
    bool public tokenFallbackExec;

    function tokenFallback(address from, uint amount, bytes calldata data) external {
        tokenFallbackExec = true;
    }
}

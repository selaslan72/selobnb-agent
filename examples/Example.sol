pragma solidity ^0.8.26;
contract Example {
    function callerOrigin() external view returns (address) { return tx.origin; }
}

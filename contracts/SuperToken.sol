// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SuperToken is ERC20 {
    constructor() ERC20("SuperToken", "SUP") {
        _mint(msg.sender, 1000000 ether);
    }
}
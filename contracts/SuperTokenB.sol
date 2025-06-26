// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SuperTokenB is ERC20, Ownable {
    address public bridge;

    constructor() ERC20("SuperTokenB", "SUPB") Ownable(msg.sender) {}


    function setBridge(address _bridge) external onlyOwner {
        bridge = _bridge;
    }

    function mint(address to, uint256 amount) external {
        require(msg.sender == bridge, "Only bridge can mint");
        _mint(to, amount);
    }
}

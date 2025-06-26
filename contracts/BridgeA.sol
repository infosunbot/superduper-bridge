// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BridgeA is Ownable {
    IERC20 public token;
    uint256 public nonce;

    event TokensLocked(address sender, uint256 amount, address recipientOnChainB, uint256 nonce);

    constructor(address _token) Ownable(msg.sender) {
        token = IERC20(_token);
    }

    function lockTokens(uint256 amount, address recipientOnChainB) external {
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit TokensLocked(msg.sender, amount, recipientOnChainB, nonce);
        nonce++;
    }

    function withdrawTokens(uint256 amount) external onlyOwner {
        require(token.transfer(msg.sender, amount), "Withdraw failed");
    }
}

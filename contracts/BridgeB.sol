// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import "./SuperTokenB.sol";

contract BridgeB is Ownable {
    SuperTokenB public token;
    address public relayer;
    mapping(uint256 => bool) public processedNonces;

    event TokensReleased(address recipient, uint256 amount, uint256 nonce);

    constructor(address _token) Ownable(msg.sender) {
        token = SuperTokenB(_token);
    }

    function setRelayer(address _relayer) external onlyOwner {
        relayer = _relayer;
    }

    function releaseTokens(
        address recipient,
        uint256 amount,
        uint256 nonce,
        bytes calldata signature
    ) external {
        require(!processedNonces[nonce], "Nonce already processed");

        bytes32 messageHash = keccak256(abi.encodePacked(recipient, amount, nonce, address(this)));
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash); 

        address signer = ECDSA.recover(ethSignedMessageHash, signature);
        require(signer == relayer, "Invalid signature");

        processedNonces[nonce] = true;
        token.mint(recipient, amount);

        emit TokensReleased(recipient, amount, nonce);
    }
}

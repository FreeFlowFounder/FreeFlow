// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract FeeDistributor {
    address public owner;

    address public validatorPool = 0x535f7b11e4F9B77d8ef04A564e09E0B4feE75fb3;
    address public teamWallet = 0x535f7b11e4F9B77d8ef04A564e09E0B4feE75fb3;
    address public treasuryWallet = 0x535f7b11e4F9B77d8ef04A564e09E0B4feE75fb3;
    address public marketingWallet = 0x535f7b11e4F9B77d8ef04A564e09E0B4feE75fb3;
    address public rndWallet = 0x535f7b11e4F9B77d8ef04A564e09E0B4feE75fb3;

    uint256 public constant BPS = 10000;

    event FeesDistributedETH(uint256 amount);
    event FeesDistributedToken(address token, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function distributeETHManually(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient ETH");

        if (
            validatorPool == teamWallet &&
            teamWallet == treasuryWallet &&
            treasuryWallet == marketingWallet &&
            marketingWallet == rndWallet
        ) {
            payable(validatorPool).transfer(amount);
        } else {
            payable(validatorPool).transfer((amount * 4000) / BPS);
            payable(teamWallet).transfer((amount * 2500) / BPS);
            payable(treasuryWallet).transfer((amount * 2000) / BPS);
            payable(marketingWallet).transfer((amount * 1000) / BPS);
            payable(rndWallet).transfer((amount * 500) / BPS);
        }

        emit FeesDistributedETH(amount);
    }

    function distributeTokenManually(IERC20 token, uint256 amount) external onlyOwner {
        require(token.balanceOf(address(this)) >= amount, "Insufficient token balance");

        require(token.transfer(validatorPool, (amount * 4000) / BPS));
        require(token.transfer(teamWallet, (amount * 2500) / BPS));
        require(token.transfer(treasuryWallet, (amount * 2000) / BPS));
        require(token.transfer(marketingWallet, (amount * 1000) / BPS));
        require(token.transfer(rndWallet, (amount * 500) / BPS));

        emit FeesDistributedToken(address(token), amount);
    }

    function updateRecipients(
        address _validator,
        address _team,
        address _treasury,
        address _marketing,
        address _rnd
    ) external onlyOwner {
        validatorPool = _validator;
        teamWallet = _team;
        treasuryWallet = _treasury;
        marketingWallet = _marketing;
        rndWallet = _rnd;
    }

    // Optional: to receive ETH manually sent in
    receive() external payable {}
}


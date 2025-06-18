// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract Campaign {
    address public owner;
    uint256 public goal;
    uint256 public deadline;
    IERC20 public flwToken;

    mapping(address => uint256) public ethContributions;
    mapping(address => uint256) public flwContributions;
    uint256 public totalEthDonated;
    uint256 public totalFlwDonated;

    constructor(
        address _owner,
        uint256 _goal,
        uint256 _durationInSeconds,
        address _flwToken
    ) {
        require(_owner != address(0), "Owner address missing");
        require(_goal > 0, "Goal must be > 0");
        require(_durationInSeconds > 0, "Duration must be > 0");
        require(_flwToken != address(0), "FLW address missing");

        owner = _owner;
        goal = _goal;
        deadline = block.timestamp + _durationInSeconds;
        flwToken = IERC20(_flwToken);
    }

    function donateETH() external payable {
        require(block.timestamp < deadline, "Campaign ended");
        require(msg.value > 0, "Must send ETH");
        ethContributions[msg.sender] += msg.value;
        totalEthDonated += msg.value;
    }

    function donateFLW(uint256 amount) external {
        require(block.timestamp < deadline, "Campaign ended");
        require(amount > 0, "Amount must be > 0");
        require(flwToken.transferFrom(msg.sender, address(this), amount), "FLW transfer failed");
        flwContributions[msg.sender] += amount;
        totalFlwDonated += amount;
    }

    function withdrawETH() external {
        require(msg.sender == owner, "Not campaign owner");
        require(block.timestamp >= deadline, "Too early");
        payable(owner).transfer(address(this).balance);
    }

    function withdrawFLW() external {
        require(msg.sender == owner, "Not campaign owner");
        require(block.timestamp >= deadline, "Too early");
        uint256 balance = flwToken.balanceOf(address(this));
        require(flwToken.transfer(owner, balance), "FLW withdraw failed");
    }
}

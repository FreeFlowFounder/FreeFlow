// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Campaign.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CampaignFactory is Ownable {
    address[] public campaigns;
    bool public testMode = false;
    address public flwToken;

    event CampaignCreated(address campaignAddress, address owner, uint256 goal, uint256 deadline, string name);
    event TestModeChanged(bool enabled);
    event TestModeAttempt(address sender, bool currentMode);

    constructor(address _flwToken) {
        flwToken = _flwToken;
        transferOwnership(msg.sender);
    }

    function createCampaign(uint256 goal, uint256 durationInDays, string memory name) external {
        uint256 duration = testMode ? durationInDays : durationInDays * 1 days;
        Campaign newCampaign = new Campaign(msg.sender, goal, duration, flwToken);
        campaigns.push(address(newCampaign));
        emit CampaignCreated(address(newCampaign), msg.sender, goal, block.timestamp + duration, name);
    }

    function setTestMode(bool _testMode) external onlyOwner {
        emit TestModeAttempt(msg.sender, testMode);
        testMode = _testMode;
        emit TestModeChanged(_testMode);
    }

    function getAllCampaigns() external view returns (address[] memory) {
        return campaigns;
    }
}

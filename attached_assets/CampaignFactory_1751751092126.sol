// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Campaign.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CampaignFactory is Ownable {
    address[] public campaigns;
    bool public testMode = false;
    address public flwToken;
    address public feeDistributor;

    event CampaignCreated(address campaignAddress, address owner, uint256 goal, uint256 deadline, string name);
    event TestModeChanged(bool enabled);
    event TestModeAttempt(address sender, bool currentMode);

    constructor(address _flwToken, address _feeDistributor) Ownable(msg.sender) {
        flwToken = _flwToken;
        feeDistributor = _feeDistributor;
    }

    function createCampaign(
        uint256 goal,
        uint256 durationInDays,
        string memory title,
        string memory description,
        string memory imageUrl
    ) external {
        uint256 duration = testMode ? durationInDays : durationInDays * 1 days;
        Campaign newCampaign = new Campaign(
            msg.sender,
            goal,
            duration,
            flwToken,
            feeDistributor,
            title,
            description,
            imageUrl
        );
        campaigns.push(address(newCampaign));
        emit CampaignCreated(address(newCampaign), msg.sender, goal, block.timestamp + duration, title);
    }

    function setTestMode(bool _testMode) external onlyOwner {
        emit TestModeAttempt(msg.sender, testMode);
        testMode = _testMode;
        emit TestModeChanged(_testMode);
    }

    function getAllCampaigns() external view returns (address[] memory) {
        return campaigns;
    }

    // ✅ NEW: Collect fees from all deployed campaigns
    function collectFeesFromAllCampaigns(address to) external onlyOwner {
        for (uint256 i = 0; i < campaigns.length; i++) {
            Campaign(payable(campaigns[i])).collectAllFees(to);
        }
    }

    // ✅ NEW: Campaign count for pagination/stats
    function getCampaignCount() external view returns (uint256) {
        return campaigns.length;
    }
}



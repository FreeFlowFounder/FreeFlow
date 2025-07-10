// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Campaign-Fixed-v4.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CampaignFactory is Ownable {
    address[] public campaigns;
    bool public testMode = false;
    address public flwToken;
    address public feeDistributor;

    event CampaignCreated(address campaignAddress, address campaignOwner, uint256 goal, uint256 deadline, string name);
    event TestModeChanged(bool enabled);
    event TestModeAttempt(address sender, bool currentMode);
    event PlatformOwnershipTransferred(address indexed previousOwner, address indexed newOwner);

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
        
        // Create campaign with msg.sender as campaign owner
        // Factory (this contract) will be stored as the fee collector
        Campaign newCampaign = new Campaign(
            msg.sender,        // Campaign owner (creator)
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

    // Platform owner can collect fees from all campaigns
    // This contract is the "owner" that campaigns check for fee collection
    function collectFeesFromAllCampaigns(address to) external onlyOwner {
        for (uint256 i = 0; i < campaigns.length; i++) {
            Campaign campaign = Campaign(payable(campaigns[i]));
            
            // Skip if campaign hasn't ended or has no fees
            if (!campaign.hasEnded()) continue;
            
            (uint256 ethFees, uint256 flwFees) = campaign.getFeeBalances();
            if (ethFees == 0 && flwFees == 0) continue;
            
            // This will work because this contract (factory) is the fee collector
            campaign.collectAllFees(to);
        }
    }

    function getCampaignCount() external view returns (uint256) {
        return campaigns.length;
    }

    // Transfer platform ownership - affects all existing and future campaigns
    function transferOwnership(address newOwner) public override onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        
        address oldOwner = owner();
        _transferOwnership(newOwner);
        
        emit PlatformOwnershipTransferred(oldOwner, newOwner);
    }

    // Helper functions for existing frontend compatibility
    function getPlatformOwner() external view returns (address) {
        return owner();
    }

    function getOwner() external view returns (address) {
        return owner();
    }

    function canCollectFeesFromCampaign(address campaignAddress) external view returns (bool) {
        Campaign campaign = Campaign(payable(campaignAddress));
        
        if (!campaign.hasEnded()) return false;
        
        (uint256 ethFees, uint256 flwFees) = campaign.getFeeBalances();
        return (ethFees > 0 || flwFees > 0);
    }

    function getTotalUncollectedFees() external view returns (uint256 totalEthFees, uint256 totalFlwFees) {
        for (uint256 i = 0; i < campaigns.length; i++) {
            Campaign campaign = Campaign(payable(campaigns[i]));
            
            if (!campaign.hasEnded()) continue;
            
            (uint256 ethFees, uint256 flwFees) = campaign.getFeeBalances();
            totalEthFees += ethFees;
            totalFlwFees += flwFees;
        }
    }
}
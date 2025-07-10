// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract Campaign {
    address public campaignOwner;    // User who created the campaign - can withdraw funds
    address public factory;          // Factory contract - can collect fees
    uint256 public goal;
    uint256 public deadline;
    address public flwToken;
    address public feeDistributor;

    string public title;
    string public description;
    string public imageUrl;

    mapping(address => uint256) public ethContributions;
    mapping(address => mapping(address => uint256)) public tokenContributions;
    mapping(address => uint256) public tokenFeesCollected;
    uint256 public ethFeesCollected;

    address[] public updates;
    string[] public updateMessages;
    uint256[] public updateTimestamps;

    event UpdatePosted(string message, uint256 timestamp);
    event WithdrawAttempt(address indexed owner, uint256 ethAmount, uint256 tokenAmount);
    event WithdrawSuccess(bool ethSent, bool tokenSent);

    modifier onlyCampaignOwner() {
        require(msg.sender == campaignOwner, "Not campaign owner");
        _;
    }

    modifier onlyFactory() {
        require(msg.sender == factory, "Not factory");
        _;
    }

    constructor(
        address _campaignOwner,
        uint256 _goal,
        uint256 _duration,
        address _flwToken,
        address _feeDistributor,
        string memory _title,
        string memory _description,
        string memory _imageUrl
    ) {
        require(_campaignOwner != address(0), "Campaign owner required");
        require(_goal > 0, "Goal must be > 0");
        require(_duration > 0, "Duration required");
        require(_flwToken != address(0), "FLW token required");
        require(_feeDistributor != address(0), "FeeDistributor required");

        campaignOwner = _campaignOwner;
        factory = msg.sender;  // Factory is the one creating this campaign
        goal = _goal;
        deadline = block.timestamp + _duration;
        flwToken = _flwToken;
        feeDistributor = _feeDistributor;
        title = _title;
        description = _description;
        imageUrl = _imageUrl;
    }

    receive() external payable {
        donateETH();
    }

    function donateETH() public payable {
        require(block.timestamp < deadline, "Campaign ended");
        require(msg.value > 0, "No ETH sent");

        uint256 fee = (msg.value * 2) / 100; // 2%
        ethFeesCollected += fee;
        ethContributions[msg.sender] += msg.value - fee;
    }

    function donateToken(address token, uint256 amount) external {
        require(block.timestamp < deadline, "Campaign ended");
        require(amount > 0, "No tokens sent");

        uint256 fee = (token == flwToken) ? (amount * 5) / 1000 : (amount * 2) / 100; // 0.5% FLW, 2% others
        uint256 netAmount = amount - fee;

        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
        tokenFeesCollected[token] += fee;
        tokenContributions[msg.sender][token] += netAmount;
    }

    // Campaign owner can withdraw their raised funds
    function withdraw() external onlyCampaignOwner {
        require(block.timestamp >= deadline, "Campaign not ended");

        uint256 ethBalance = address(this).balance - ethFeesCollected;
        uint256 flwBalance = IERC20(flwToken).balanceOf(address(this)) - tokenFeesCollected[flwToken];

        bool ethSent = true;
        bool flwSent = true;

        if (ethBalance > 0) {
            (ethSent, ) = payable(campaignOwner).call{value: ethBalance}("");
        }

        if (flwBalance > 0) {
            flwSent = IERC20(flwToken).transfer(campaignOwner, flwBalance);
        }

        emit WithdrawSuccess(ethSent, flwSent);
        require(ethSent || flwSent, "Nothing withdrawn");
    }

    // Factory can collect fees
    function collectETHFees(address to) public onlyFactory {
        uint256 amount = ethFeesCollected;
        ethFeesCollected = 0;
        (bool success, ) = payable(to).call{value: amount}("");
        require(success, "ETH fee transfer failed");
    }

    // Factory can collect fees
    function collectTokenFees(address token, address to) public onlyFactory {
        uint256 amount = tokenFeesCollected[token];
        tokenFeesCollected[token] = 0;
        require(IERC20(token).transfer(to, amount), "Token fee transfer failed");
    }

    // Factory can collect all fees
    function collectAllFees(address to) external onlyFactory {
        collectETHFees(to);
        collectTokenFees(flwToken, to);
    }

    // Campaign owner can post updates
    function postUpdate(string calldata message) external onlyCampaignOwner {
        updates.push(msg.sender);
        updateMessages.push(message);
        updateTimestamps.push(block.timestamp);
        emit UpdatePosted(message, block.timestamp);
    }

    function getUpdateCount() external view returns (uint256) {
        return updateMessages.length;
    }

    function getUpdate(uint256 index) external view returns (string memory, uint256) {
        require(index < updateMessages.length, "Invalid index");
        return (updateMessages[index], updateTimestamps[index]);
    }

    function hasEnded() public view returns (bool) {
        return block.timestamp >= deadline;
    }

    function getWithdrawableAmount() public view returns (uint256 ethAmount, uint256 flwAmount) {
        if (block.timestamp < deadline) {
            return (0, 0);
        }
        
        uint256 ethBalance = address(this).balance;
        uint256 flwBalance = IERC20(flwToken).balanceOf(address(this));
        
        ethAmount = ethBalance > ethFeesCollected ? ethBalance - ethFeesCollected : 0;
        flwAmount = flwBalance > tokenFeesCollected[flwToken] ? flwBalance - tokenFeesCollected[flwToken] : 0;
    }

    function getFeeBalances() public view returns (uint256 ethFees, uint256 flwFees) {
        return (ethFeesCollected, tokenFeesCollected[flwToken]);
    }

    function getTotalBalance() public view returns (uint256 ethBalance, uint256 flwBalance) {
        return (address(this).balance, IERC20(flwToken).balanceOf(address(this)));
    }

    function isActive() public view returns (bool) {
        return block.timestamp < deadline;
    }

    function getGoal() public view returns (uint256) {
        return goal;
    }

    // For backwards compatibility with existing frontend - returns campaign owner
    function owner() public view returns (address) {
        return campaignOwner;
    }

    // Additional compatibility functions for existing frontend
    function getDeadline() public view returns (uint256) {
        return deadline;
    }

    function getTitle() public view returns (string memory) {
        return title;
    }

    function getDescription() public view returns (string memory) {
        return description;
    }

    function getImageUrl() public view returns (string memory) {
        return imageUrl;
    }

    // Helper functions
    function getFactory() public view returns (address) {
        return factory;
    }
}
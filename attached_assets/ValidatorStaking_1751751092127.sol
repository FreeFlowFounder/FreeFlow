// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
}

contract ValidatorStaking {
    IERC20 public immutable flwToken;
    address public owner;
    uint256 public constant MIN_STAKE = 1000 * 1e18;

    struct Validator {
        uint256 staked;
        bool active;
    }

    mapping(address => Validator) public validators;
    mapping(bytes32 => address[]) public campaignVouches;

    event Staked(address indexed validator, uint256 amount);
    event Unstaked(address indexed validator, uint256 amount);
    event Vouched(address indexed validator, bytes32 indexed campaignId);
    event Slashed(address indexed validator, uint256 amount, bytes32 campaignId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor(address _flwToken) {
        flwToken = IERC20(_flwToken);
        owner = msg.sender;
    }

    function stake(uint256 amount) external {
        require(amount >= MIN_STAKE, "Insufficient stake");
        flwToken.transferFrom(msg.sender, address(this), amount);

        validators[msg.sender].staked += amount;
        validators[msg.sender].active = true;

        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external {
        require(validators[msg.sender].staked >= amount, "Not enough staked");
        validators[msg.sender].staked -= amount;

        if (validators[msg.sender].staked == 0) {
            validators[msg.sender].active = false;
        }

        flwToken.transfer(msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }

    function vouchForCampaign(bytes32 campaignId) external {
        require(validators[msg.sender].active, "Not a validator");
        campaignVouches[campaignId].push(msg.sender);

        emit Vouched(msg.sender, campaignId);
    }

    function slashValidator(address validator, bytes32 campaignId, uint256 amount) external onlyOwner {
        require(validators[validator].staked >= amount, "Cannot slash more than staked");

        validators[validator].staked -= amount;
        if (validators[validator].staked == 0) {
            validators[validator].active = false;
        }

        emit Slashed(validator, amount, campaignId);
    }
}
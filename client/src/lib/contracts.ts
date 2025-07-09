import { ethers } from 'ethers';
import { WalletInfo } from './wallet';
import { getAddress } from './contract-config';

// Contract ABI for CampaignFactory
const CAMPAIGN_FACTORY_ABI = [
  "function createCampaign(uint256 goal, uint256 durationInDays, string memory title, string memory description, string memory imageUrl) external",
  "function getAllCampaigns() external view returns (address[] memory)",
  "function getCampaignCount() external view returns (uint256)",
  "function setTestMode(bool _testMode) external",
  "function testMode() external view returns (bool)",
  "function flwToken() external view returns (address)",
  "function feeDistributor() external view returns (address)",
  "function collectFeesFromAllCampaigns(address feeDistributorAddress) external",
  "function campaignOwner() external view returns (address)",
  "function getOwner() external view returns (address)",
  "event CampaignCreated(address campaignAddress, address owner, uint256 goal, uint256 deadline, string name)"
];

// Contract ABI for individual Campaign contracts (based on working old frontend)
const CAMPAIGN_ABI = [
  "function goal() view returns (uint256)",
  "function deadline() view returns (uint256)",
  "function campaignOwner() view returns (address)",
  "function title() view returns (string)",
  "function description() view returns (string)",
  "function imageUrl() view returns (string)",
  "function getUpdateCount() view returns (uint256)",
  "function getUpdate(uint256 index) view returns (string, uint256)",
  "function postUpdate(string memory newUpdate)",
  "function donateETH() payable",
  "function donateToken(address token, uint256 amount)",
  "function flwToken() view returns (address)",
  "function getWithdrawableAmount() view returns (uint256,uint256)",
  "function getFeeBalances() view returns (uint256,uint256)",
  "function withdraw()",
  "function ethFeesCollected() view returns (uint256)",
  "function tokenFeesCollected(address) view returns (uint256)",
  "function collectFees(address feeDistributorAddress) external"
];

// FeeDistributor ABI (for admin panel)
const FEE_DISTRIBUTOR_ABI = [
  "function distributeETHManually(uint256 amount) external",
  "function distributeTokenManually(address token, uint256 amount) external", 
  "function updateRecipients(address,address,address,address,address) external",
  "function owner() view returns (address)"
];

export class CampaignFactoryContract {
  private contract: ethers.Contract;
  private signer: ethers.Signer;

  constructor(contractAddress: string, signer: ethers.Signer) {
    this.contract = new ethers.Contract(contractAddress, CAMPAIGN_FACTORY_ABI, signer);
    this.signer = signer;
  }

  async createCampaign(
    goal: string,
    durationInDays: number,
    title: string,
    description: string,
    imageUrl: string
  ): Promise<string> {
    try {
      // Check test mode before creating campaign
      let testMode = false;
      try {
        testMode = await this.contract.testMode();
        console.log('Campaign Factory test mode:', testMode);
      } catch (error) {
        console.log('Could not check test mode, assuming false');
      }
      
      console.log('Creating campaign with duration:', durationInDays, testMode ? 'seconds (test mode)' : 'days (production mode)');
      
      const tx = await this.contract.createCampaign(
        ethers.parseEther(goal),
        durationInDays,
        title,
        description,
        imageUrl
      );
      return tx.hash;
    } catch (error) {
      console.error('Failed to create campaign:', error);
      throw new Error('Failed to create campaign');
    }
  }

  async getAllCampaigns(): Promise<string[]> {
    try {
      return await this.contract.getAllCampaigns();
    } catch (error) {
      console.error('Failed to get campaigns:', error);
      throw new Error('Failed to get campaigns');
    }
  }

  async getCampaignCount(): Promise<number> {
    try {
      const count = await this.contract.getCampaignCount();
      return Number(count);
    } catch (error) {
      console.error('Failed to get campaign count:', error);
      throw new Error('Failed to get campaign count');
    }
  }

  async getTestMode(): Promise<boolean> {
    try {
      return await this.contract.testMode();
    } catch (error) {
      console.error('Failed to get test mode:', error);
      return false; // Default to false if unable to read
    }
  }

  async collectFeesFromAllCampaigns(feeDistributorAddress: string): Promise<string> {
    try {
      const tx = await this.contract.collectFeesFromAllCampaigns(feeDistributorAddress, {
        gasLimit: 3000000 // High gas limit like old frontend
      });
      return tx.hash;
    } catch (error) {
      console.error('Failed to collect fees from campaigns:', error);
      throw new Error('Failed to collect fees from campaigns');
    }
  }

  async getOwner(): Promise<string> {
    try {
      // Try both function names to find the correct one
      try {
        return await this.contract.owner();
      } catch (ownerError) {
        console.log('owner() failed, trying getOwner()...', ownerError);
        return await this.contract.getOwner();
      }
    } catch (error) {
      console.error('Failed to get factory owner with both owner() and getOwner():', error);
      throw new Error('Failed to get factory owner');
    }
  }

  getAddress(): string {
    return this.contract.target as string || (this.contract as any).address;
  }
}

export class CampaignContract {
  private contract: ethers.Contract;
  private signer: ethers.Signer;

  constructor(contractAddress: string, signer: ethers.Signer) {
    this.contract = new ethers.Contract(contractAddress, CAMPAIGN_ABI, signer);
    this.signer = signer;
  }

  async donateETH(amount: string): Promise<string> {
    try {
      // Check if campaign is still active before donating
      const deadline = await this.contract.deadline();
      const now = Math.floor(Date.now() / 1000);
      console.log('Campaign deadline check:', { 
        deadline: Number(deadline), 
        now, 
        isActive: now < Number(deadline),
        timeLeft: Number(deadline) - now 
      });
      
      if (now >= Number(deadline)) {
        throw new Error('Campaign has ended. Cannot make donations after deadline.');
      }
      
      // Try with explicit gas settings
      const tx = await this.contract.donateETH({
        value: ethers.parseEther(amount),
        gasLimit: 200000, // Manual gas limit
        gasPrice: ethers.parseUnits('20', 'gwei') // Manual gas price
      });
      return tx.hash;
    } catch (error) {
      console.error('Failed to donate ETH:', error);
      
      // Extract meaningful error message
      let errorMessage = 'Failed to donate ETH';
      if (error instanceof Error) {
        if (error.message.includes('Campaign ended')) {
          errorMessage = 'Campaign has ended. Cannot make donations after deadline.';
        } else if (error.message.includes('execution reverted')) {
          errorMessage = 'Transaction reverted: ' + (error.message.split('execution reverted: ')[1] || 'Unknown reason');
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient ETH balance for donation + gas fees';
        } else {
          errorMessage = error.message;
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  async donateToken(tokenAddress: string, amount: string, decimals: number = 18): Promise<string> {
    try {
      // Check if campaign is still active
      const deadline = await this.contract.deadline();
      const now = Math.floor(Date.now() / 1000);
      
      if (now >= Number(deadline)) {
        throw new Error('Campaign has ended. Cannot make donations after deadline.');
      }
      
      const tx = await this.contract.donateToken(
        tokenAddress,
        ethers.parseUnits(amount, decimals)
      );
      return tx.hash;
    } catch (error) {
      console.error('Failed to donate token:', error);
      
      let errorMessage = 'Failed to donate token';
      if (error instanceof Error) {
        if (error.message.includes('Campaign ended')) {
          errorMessage = 'Campaign has ended. Cannot make donations after deadline.';
        } else if (error.message.includes('ERC20: insufficient allowance')) {
          errorMessage = 'Token allowance not set. Please approve the campaign contract first.';
        } else if (error.message.includes('ERC20: transfer amount exceeds balance')) {
          errorMessage = 'Insufficient token balance for donation.';
        } else {
          errorMessage = error.message;
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  async approveToken(tokenAddress: string, amount: string, decimals: number = 18): Promise<string> {
    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          'function approve(address spender, uint256 amount) returns (bool)',
          'function allowance(address owner, address spender) view returns (uint256)'
        ],
        this.signer
      );
      
      const amountWei = ethers.parseUnits(amount, decimals);
      const tx = await tokenContract.approve(this.contract.target, amountWei);
      return tx.hash;
    } catch (error) {
      console.error('Failed to approve token:', error);
      throw new Error('Failed to approve token');
    }
  }

  async getTokenAllowance(tokenAddress: string, ownerAddress: string, decimals: number = 18): Promise<string> {
    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function allowance(address owner, address spender) view returns (uint256)'],
        this.signer.provider!
      );
      
      const allowance = await tokenContract.allowance(ownerAddress, this.contract.target);
      return ethers.formatUnits(allowance, decimals);
    } catch (error) {
      console.error('Failed to get token allowance:', error);
      throw new Error('Failed to get token allowance');
    }
  }

  async getGoal(): Promise<string> {
    try {
      const goal = await this.contract.goal();
      return ethers.formatEther(goal);
    } catch (error) {
      console.error('Failed to get goal:', error);
      throw new Error('Failed to get goal');
    }
  }

  async getOwner(): Promise<string> {
    try {
      return await this.contract.campaignOwner();
    } catch (error) {
      console.error('Failed to get campaign owner:', error);
      throw new Error('Failed to get campaign owner');
    }
  }

  async getTitle(): Promise<string> {
    try {
      return await this.contract.title();
    } catch (error) {
      console.error('Failed to get title:', error);
      throw new Error('Failed to get title');
    }
  }

  async getDescription(): Promise<string> {
    try {
      return await this.contract.description();
    } catch (error) {
      console.error('Failed to get description:', error);
      throw new Error('Failed to get description');
    }
  }

  async withdraw(): Promise<string> {
    try {
      // Check if campaign has ended before attempting withdrawal
      const deadline = await this.contract.deadline();
      const now = Math.floor(Date.now() / 1000);
      
      if (now < Number(deadline)) {
        const timeLeft = Number(deadline) - now;
        throw new Error(`Campaign is still active. ${Math.ceil(timeLeft / 60)} minutes remaining until withdrawal is allowed.`);
      }
      
      const tx = await this.contract.withdraw();
      return tx.hash;
    } catch (error) {
      console.error('Failed to withdraw:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Campaign not ended')) {
          try {
            const deadline = await this.contract.deadline();
            const now = Math.floor(Date.now() / 1000);
            const timeLeft = Number(deadline) - now;
            throw new Error(`Campaign is still active. Wait ${Math.ceil(timeLeft / 60)} more minutes before withdrawal.`);
          } catch {
            throw new Error('Campaign has not ended yet. Please wait for the deadline.');
          }
        }
        throw error;
      }
      
      throw new Error('Failed to withdraw');
    }
  }

  async isActive(): Promise<boolean> {
    try {
      const deadline = await this.contract.deadline();
      const now = Math.floor(Date.now() / 1000);
      return now < Number(deadline);
    } catch (error) {
      console.error('Failed to check if active:', error);
      throw new Error('Failed to check if active');
    }
  }

  async getDeadline(): Promise<number> {
    try {
      const deadline = await this.contract.deadline();
      return Number(deadline);
    } catch (error) {
      console.error('Failed to get deadline:', error);
      throw new Error('Failed to get deadline');
    }
  }

  async getWithdrawableBalance(): Promise<{ eth: string; tokens: Record<string, string> }> {
    try {
      console.log('Calling getWithdrawableAmount() on contract...');
      const result = await this.contract.getWithdrawableAmount();
      
      // Handle both array destructuring and direct access patterns
      const ethAmount = Array.isArray(result) ? result[0] : result.ethAmount || result[0];
      const tokenAmount = Array.isArray(result) ? result[1] : result.flwAmount || result[1];
      
      console.log('Raw withdrawable values:', { 
        ethAmount: ethAmount?.toString() || '0', 
        tokenAmount: tokenAmount?.toString() || '0' 
      });
      
      const formattedResult = {
        eth: ethAmount ? ethers.formatEther(ethAmount) : '0.0',
        tokens: { flw: tokenAmount ? ethers.formatEther(tokenAmount) : '0.0' }
      };
      console.log('Formatted withdrawable:', formattedResult);
      return formattedResult;
    } catch (error) {
      console.error('Failed to get withdrawable balance:', error);
      throw new Error('Failed to get withdrawable balance');
    }
  }

  async getFeeBalances(): Promise<{ eth: string; tokens: Record<string, string> }> {
    try {
      console.log('Calling getFeeBalances() on contract...');
      const [ethFee, flwFee] = await this.contract.getFeeBalances();
      console.log('Raw fee values:', { ethFee: ethFee.toString(), flwFee: flwFee.toString() });
      
      const result = {
        eth: ethers.formatEther(ethFee),
        tokens: { flw: ethers.formatEther(flwFee) }
      };
      console.log('Formatted fees:', result);
      return result;
    } catch (error) {
      console.error('Failed to get fee balances:', error);
      throw new Error('Failed to get fee balances');
    }
  }

  async getTotalBalance(): Promise<{ eth: string; tokens: Record<string, string> }> {
    try {
      // Use the same approach as old frontend: direct balance check
      const contractAddress = await this.contract.getAddress();
      const ethBalance = await this.signer.provider!.getBalance(contractAddress);
      console.log('Direct contract ETH balance:', ethers.formatEther(ethBalance));
      
      return {
        eth: ethers.formatEther(ethBalance),
        tokens: {} // Old frontend doesn't track token totals
      };
    } catch (error) {
      console.error('Failed to get total balance:', error);
      // Fallback for older ethers versions
      try {
        const contractAddress = this.contract.target as string || (this.contract as any).address;
        const ethBalance = await this.signer.provider!.getBalance(contractAddress);
        
        return {
          eth: ethers.formatEther(ethBalance),
          tokens: {}
        };
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        throw new Error('Failed to get total balance');
      }
    }
  }

  async getUpdateCount(): Promise<number> {
    try {
      const count = await this.contract.getUpdateCount();
      return Number(count);
    } catch (error) {
      console.error('Failed to get update count:', error);
      throw new Error('Failed to get update count');
    }
  }

  async getUpdate(index: number): Promise<{ message: string; timestamp: number }> {
    try {
      const [message, timestamp] = await this.contract.getUpdate(index);
      return {
        message,
        timestamp: Number(timestamp)
      };
    } catch (error) {
      console.error('Failed to get update:', error);
      throw new Error('Failed to get update');
    }
  }

  async postUpdate(message: string): Promise<string> {
    try {
      const tx = await this.contract.postUpdate(message);
      return tx.hash;
    } catch (error) {
      console.error('Failed to post update:', error);
      throw new Error('Failed to post update');
    }
  }
}

export const createCampaignFactoryContract = (address: string, wallet: WalletInfo): CampaignFactoryContract => {
  return new CampaignFactoryContract(address, wallet.signer);
};

export const createCampaignContract = (address: string, wallet: WalletInfo): CampaignContract => {
  return new CampaignContract(address, wallet.signer);
};

// Helper functions to get contract instances with your deployed addresses
export const getCampaignFactoryContract = (wallet: WalletInfo): CampaignFactoryContract => {
  const factoryAddress = CONTRACT_ADDRESSES.CAMPAIGN_FACTORY;
  if (!factoryAddress) {
    throw new Error('CampaignFactory address not found for current network');
  }
  return createCampaignFactoryContract(factoryAddress, wallet);
};

export const getCampaignContract = (campaignAddress: string, wallet: WalletInfo): CampaignContract => {
  return createCampaignContract(campaignAddress, wallet);
};

// FeeDistributor contract interface
export class FeeDistributorContract {
  private contract: ethers.Contract;
  private signer: ethers.Signer;

  constructor(contractAddress: string, signer: ethers.Signer) {
    this.signer = signer;
    const abi = [
      'function owner() view returns (address)',
      'function distributeETHManually(uint256 amount)',
      'function distributeTokenManually(address token, uint256 amount)',
      'function validatorPool() view returns (address)',
      'function teamWallet() view returns (address)',
      'function treasuryWallet() view returns (address)',
      'function marketingWallet() view returns (address)',
      'function rndWallet() view returns (address)',
      'function updateRecipients(address _validator, address _team, address _treasury, address _marketing, address _rnd)',
      'event FeesDistributedETH(uint256 amount)',
      'event FeesDistributedToken(address token, uint256 amount)'
    ];
    this.contract = new ethers.Contract(contractAddress, abi, signer);
  }

  async getOwner(): Promise<string> {
    return await this.contract.owner();
  }

  async getBalance(): Promise<string> {
    const balance = await this.signer.provider!.getBalance(this.contract.target);
    return ethers.formatEther(balance);
  }

  async getRecipients(): Promise<{
    validator: string;
    team: string;
    treasury: string;
    marketing: string;
    rnd: string;
  }> {
    const [validator, team, treasury, marketing, rnd] = await Promise.all([
      this.contract.validatorPool(),
      this.contract.teamWallet(),
      this.contract.treasuryWallet(),
      this.contract.marketingWallet(),
      this.contract.rndWallet()
    ]);
    
    return { validator, team, treasury, marketing, rnd };
  }

  async distributeETHManually(amountInEth: string): Promise<string> {
    const amountWei = ethers.parseEther(amountInEth);
    const tx = await this.contract.distributeETHManually(amountWei, {
      gasLimit: 500000 // Higher gas limit for multiple transfers
    });
    return tx.hash;
  }

  async getTokenBalance(tokenAddress: string): Promise<string> {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
      this.signer.provider!
    );
    
    const [balance, decimals] = await Promise.all([
      tokenContract.balanceOf(this.contract.target),
      tokenContract.decimals()
    ]);
    
    return ethers.formatUnits(balance, decimals);
  }

  async distributeTokenManually(tokenAddress: string, amount: string, decimals: number = 18): Promise<string> {
    const amountWei = ethers.parseUnits(amount, decimals);
    const tx = await this.contract.distributeTokenManually(tokenAddress, amountWei, {
      gasLimit: 500000
    });
    return tx.hash;
  }

  async updateRecipients(
    validator: string,
    team: string,
    treasury: string,
    marketing: string,
    rnd: string
  ): Promise<any> {
    const tx = await this.contract.updateRecipients(validator, team, treasury, marketing, rnd);
    return tx;
  }

  async testDistribution(): Promise<{
    owner: string;
    balance: string;
    recipients: any;
    canDistribute: boolean;
    reason?: string;
  }> {
    try {
      const [owner, balance, recipients] = await Promise.all([
        this.getOwner(),
        this.getBalance(),
        this.getRecipients()
      ]);

      const signerAddress = await this.signer.getAddress();
      const canDistribute = signerAddress.toLowerCase() === owner.toLowerCase();
      
      return {
        owner,
        balance,
        recipients,
        canDistribute,
        reason: canDistribute ? undefined : `Signer ${signerAddress} is not owner ${owner}`
      };
    } catch (error) {
      return {
        owner: 'Error',
        balance: '0',
        recipients: {},
        canDistribute: false,
        reason: `Failed to check: ${error}`
      };
    }
  }
}

export const getFeeDistributorContract = (wallet: WalletInfo): FeeDistributorContract => {
  return new FeeDistributorContract(CONTRACT_ADDRESSES.FEE_DISTRIBUTOR, wallet.signer);
};

// Contract addresses from your deployed contracts
export const CONTRACT_ADDRESSES = {
  CAMPAIGN_FACTORY: getAddress('CampaignFactory'),
  FLW_TOKEN: getAddress('FLW'),
  FEE_DISTRIBUTOR: getAddress('FeeDistributor'),
  VALIDATOR_STAKING: getAddress('ValidatorStaking'),
};

// Token addresses for Base chain
export const TOKEN_ADDRESSES = {
  ETH: '0x0000000000000000000000000000000000000000',
  USDC: getAddress('USDC'),
  FLW: getAddress('FLW'),
};

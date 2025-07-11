import { ethers } from 'ethers';

// Types for donation tracking
interface DonationRecord {
  amount: string;
  token: string;
  usdValue: string;
  timestamp: number;
  txHash?: string;
}

interface CampaignProgress {
  goalUSD: string;
  goalETH: string; // Keep ETH goal for reference
  donations: DonationRecord[];
  totalRaisedUSD: string;
  progress: number;
  isEnded: boolean;
  endTimestamp?: number;
}

// Storage keys
const CAMPAIGN_PROGRESS_KEY = 'campaign_progress_';
const GLOBAL_DONATIONS_KEY = 'global_donations';

export class ProgressTracker {
  // Get campaign progress data
  static getCampaignProgress(campaignAddress: string): CampaignProgress | null {
    const key = CAMPAIGN_PROGRESS_KEY + campaignAddress;
    const data = localStorage.getItem(key);
    if (!data) return null;
    
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  // Initialize campaign progress tracking with blockchain state recovery
  static async initializeCampaign(
    campaignAddress: string, 
    goalInEth: string,
    isActive?: boolean,
    provider?: any
  ): Promise<void> {
    const existing = this.getCampaignProgress(campaignAddress);
    if (existing) return; // Already initialized
    
    // Convert ETH goal to USD at campaign creation
    const goalUSD = await this.convertEthToUSD(goalInEth);
    
    let initialTotalRaisedUSD = '0';
    let initialProgress = 0;
    
    // For active campaigns, try to recover progress from blockchain
    if (isActive && provider) {
      try {
        const campaignAbi = [
          "function getWithdrawableAmount() view returns (uint256,uint256)",
          "function goal() view returns (uint256)"
        ];
        
        const campaignContract = new ethers.Contract(campaignAddress, campaignAbi, provider);
        
        // Get the withdrawable amount (total raised minus fees)
        const [withdrawableWei, feeWei] = await campaignContract.getWithdrawableAmount();
        const totalRaisedWei = withdrawableWei + feeWei; // Add back the fees to get total raised
        const totalRaisedEth = ethers.formatEther(totalRaisedWei);
        
        // Convert to USD for progress tracking
        if (parseFloat(totalRaisedEth) > 0) {
          initialTotalRaisedUSD = await this.convertEthToUSD(totalRaisedEth);
          initialProgress = Math.round((parseFloat(initialTotalRaisedUSD) / parseFloat(goalUSD)) * 100 * 100) / 100;
          
          // Create a synthetic donation record to represent blockchain state
          const syntheticDonation: DonationRecord = {
            amount: totalRaisedEth,
            token: 'ETH',
            usdValue: initialTotalRaisedUSD,
            timestamp: Date.now(),
            txHash: 'BLOCKCHAIN_RECOVERY'
          };
          
          const progress: CampaignProgress = {
            goalUSD,
            goalETH: goalInEth,
            donations: [syntheticDonation],
            totalRaisedUSD: initialTotalRaisedUSD,
            progress: initialProgress,
            isEnded: false
          };
          
          this.saveCampaignProgress(campaignAddress, progress);
          return;
        }
      } catch (error) {
        console.warn(`Failed to recover blockchain state for ${campaignAddress}:`, error);
        // Continue with normal initialization
      }
    }
    
    // Normal initialization (new campaign or recovery failed)
    const progress: CampaignProgress = {
      goalUSD,
      goalETH: goalInEth,
      donations: [],
      totalRaisedUSD: initialTotalRaisedUSD,
      progress: initialProgress,
      isEnded: false
    };
    
    this.saveCampaignProgress(campaignAddress, progress);
  }

  // Record a donation
  static async recordDonation(
    campaignAddress: string, 
    amount: string, 
    token: string = 'ETH',
    txHash?: string
  ): Promise<void> {
    const progress = this.getCampaignProgress(campaignAddress);
    if (!progress) {
      console.warn(`Cannot record donation: Campaign ${campaignAddress} not initialized`);
      return;
    }

    // Convert donation to USD value
    const usdValue = await this.convertToUSD(amount, token);

    // Add donation record
    const donation: DonationRecord = {
      amount,
      token,
      usdValue,
      timestamp: Date.now(),
      txHash
    };
    
    progress.donations.push(donation);
    
    // Recalculate total raised in USD
    const totalRaisedUSD = progress.donations
      .reduce((sum, d) => sum + parseFloat(d.usdValue), 0);
    
    progress.totalRaisedUSD = totalRaisedUSD.toString();
    progress.progress = Math.round((totalRaisedUSD / parseFloat(progress.goalUSD)) * 100 * 100) / 100;
    
    this.saveCampaignProgress(campaignAddress, progress);
  }

  // Mark campaign as ended (locks progress)
  static endCampaign(campaignAddress: string): void {
    const progress = this.getCampaignProgress(campaignAddress);
    if (!progress) return;
    
    progress.isEnded = true;
    progress.endTimestamp = Date.now();
    
    this.saveCampaignProgress(campaignAddress, progress);
    console.log(`Campaign ${campaignAddress} ended - progress locked at ${progress.progress}%`);
  }

  // Get current progress percentage
  static getProgressPercentage(campaignAddress: string): number {
    const progress = this.getCampaignProgress(campaignAddress);
    return progress ? progress.progress : 0;
  }

  // Get total raised amount in USD
  static getTotalRaisedUSD(campaignAddress: string): string {
    const progress = this.getCampaignProgress(campaignAddress);
    return progress ? progress.totalRaisedUSD : '0';
  }

  // Get total raised amount in ETH equivalent (for display purposes)
  static async getTotalRaisedETH(campaignAddress: string): Promise<string> {
    const progress = this.getCampaignProgress(campaignAddress);
    if (!progress) return '0';
    
    // Calculate ETH total from actual ETH donations (not USD conversion)
    let totalETH = 0;
    for (const donation of progress.donations) {
      if (donation.token === 'ETH') {
        totalETH += parseFloat(donation.amount);
      }
    }
    
    return totalETH.toFixed(6);
  }

  // Check if campaign progress is locked (ended)
  static isProgressLocked(campaignAddress: string): boolean {
    const progress = this.getCampaignProgress(campaignAddress);
    return progress ? progress.isEnded : false;
  }

  // Save progress data to localStorage
  private static saveCampaignProgress(campaignAddress: string, progress: CampaignProgress): void {
    const key = CAMPAIGN_PROGRESS_KEY + campaignAddress;
    localStorage.setItem(key, JSON.stringify(progress));
  }

  // Sync with blockchain data (for initial load or verification)
  static async syncWithBlockchain(
    campaignAddress: string, 
    goalInEth: string,
    currentRaisedInEth: string,
    isActive: boolean
  ): Promise<void> {
    const progress = this.getCampaignProgress(campaignAddress);
    
    if (!progress) {
      // Initialize with blockchain data
      await this.initializeCampaign(campaignAddress, goalInEth);
      const newProgress = this.getCampaignProgress(campaignAddress)!;
      
      // Convert blockchain ETH amount to USD
      const currentRaisedUSD = await this.convertEthToUSD(currentRaisedInEth);
      newProgress.totalRaisedUSD = currentRaisedUSD;
      newProgress.progress = Math.round((parseFloat(currentRaisedUSD) / parseFloat(newProgress.goalUSD)) * 100 * 100) / 100;
      newProgress.isEnded = !isActive;
      if (!isActive) {
        newProgress.endTimestamp = Date.now();
      }
      this.saveCampaignProgress(campaignAddress, newProgress);
    } else if (progress.isEnded) {
      // Progress is locked, don't update
      return;
    } else {
      // For active campaigns, only update if we have no donations recorded yet
      if (progress.donations.length === 0) {
        const currentRaisedUSD = await this.convertEthToUSD(currentRaisedInEth);
        const blockchainRaisedUSD = parseFloat(currentRaisedUSD);
        const trackedRaisedUSD = parseFloat(progress.totalRaisedUSD);
        
        if (blockchainRaisedUSD > trackedRaisedUSD) {
          progress.totalRaisedUSD = currentRaisedUSD;
          progress.progress = Math.round((blockchainRaisedUSD / parseFloat(progress.goalUSD)) * 100 * 100) / 100;
          this.saveCampaignProgress(campaignAddress, progress);
        }
      }
      
      // Mark as ended if blockchain shows inactive
      if (!isActive && !progress.isEnded) {
        this.endCampaign(campaignAddress);
      }
    }
  }

  // Price conversion functions
  static async convertToUSD(amount: string, token: string): Promise<string> {
    try {
      if (token === 'USDC') {
        // USDC is stable coin - should be 1:1 with USD, but let's verify with real price
        return await this.getTokenPriceUSD('usd-coin', amount);
      } else if (token === 'ETH') {
        return await this.getTokenPriceUSD('ethereum', amount);
      } else if (token === 'FLW') {
        // For FLW, we need to get the actual token price
        // Since FLW may not be on CoinGecko yet, we'll use a configurable price
        return await this.getFLWPriceUSD(amount);
      }
      return '0';
    } catch (error) {
      console.error('Error converting to USD:', error);
      return '0';
    }
  }

  static async getTokenPriceUSD(coinGeckoId: string, amount: string): Promise<string> {
    try {
      // Try to get real-time price from CoinGecko API first
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoId}&vs_currencies=usd`
      );
      
      if (response.ok) {
        const data = await response.json();
        const price = data[coinGeckoId]?.usd;
        if (price) {
          const usdValue = parseFloat(amount) * price;
          console.log(`Using real-time price for ${coinGeckoId}: $${price}`);
          return usdValue.toFixed(2);
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch ${coinGeckoId} price from CoinGecko:`, error);
    }
    
    // Fallback prices only if API fails
    const fallbackPrices: { [key: string]: number } = {
      'ethereum': 3500,
      'usd-coin': 1,
      'freeflow-token': 1
    };
    
    const fallbackPrice = fallbackPrices[coinGeckoId] || 1;
    const usdValue = parseFloat(amount) * fallbackPrice;
    console.log(`Using fallback price for ${coinGeckoId}: $${fallbackPrice}`);
    return usdValue.toFixed(2);
  }

  static async convertEthToUSD(ethAmount: string): Promise<string> {
    return await this.getTokenPriceUSD('ethereum', ethAmount);
  }

  static async convertUSDToEth(usdAmount: string): Promise<string> {
    try {
      // Try to get real-time ETH price from CoinGecko API first
      const response = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
      );
      
      if (response.ok) {
        const data = await response.json();
        const ethPrice = data.ethereum?.usd;
        if (ethPrice) {
          const ethValue = parseFloat(usdAmount) / ethPrice;
          console.log(`Using real-time ETH price: $${ethPrice}`);
          return ethValue.toFixed(6);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch ETH price from CoinGecko:', error);
    }
    
    // Fallback price only if API fails
    const ethPrice = 3500;
    const ethValue = parseFloat(usdAmount) / ethPrice;
    console.log(`Using fallback ETH price: $${ethPrice}`);
    return ethValue.toFixed(6);
  }

  // FLW-specific price handling
  static async getFLWPriceUSD(amount: string): Promise<string> {
    // Use configured FLW price directly to avoid CORS issues in production
    const configuredFLWPrice = this.getConfiguredFLWPrice();
    const usdValue = parseFloat(amount) * configuredFLWPrice;
    console.log(`Using configured FLW price: $${configuredFLWPrice}`);
    return usdValue.toFixed(2);
  }

  // Get configured FLW price (can be updated when FLW has real market price)
  static getConfiguredFLWPrice(): number {
    // This can be updated when FLW has a real market price
    // For now, assume 1:1 USD for simplicity
    return 1.0;
  }

  // Update FLW price configuration (for future use)
  static setFLWPrice(priceUSD: number): void {
    localStorage.setItem('flw_price_usd', priceUSD.toString());
  }

  // Clear all progress data (for testing/debugging)
  static clearAllData(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CAMPAIGN_PROGRESS_KEY)) {
        localStorage.removeItem(key);
      }
    });
  }
}
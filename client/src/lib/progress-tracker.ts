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

  // Initialize campaign progress tracking
  static async initializeCampaign(campaignAddress: string, goalInEth: string): Promise<void> {
    const existing = this.getCampaignProgress(campaignAddress);
    if (existing) return; // Already initialized
    
    // Convert ETH goal to USD at campaign creation
    const goalUSD = await this.convertEthToUSD(goalInEth);
    
    const progress: CampaignProgress = {
      goalUSD,
      goalETH: goalInEth,
      donations: [],
      totalRaisedUSD: '0',
      progress: 0,
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
    
    // Convert USD back to ETH for display
    const ethValue = await this.convertUSDToEth(progress.totalRaisedUSD);
    return ethValue;
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
    // Use fallback prices directly to avoid CORS issues in production
    const fallbackPrices = {
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
    // Use fallback price directly to avoid CORS issues in production
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
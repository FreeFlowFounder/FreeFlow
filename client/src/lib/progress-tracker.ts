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
  finalETHAmount?: string; // Stores the final ETH amount when campaign ends
  finalTokenBalances?: { [token: string]: string }; // Stores final token balances
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
    if (existing && existing.isEnded) {
      console.log(`Campaign ${campaignAddress} already ended with locked progress: ${existing.progress}%`);
      return; // Don't modify ended campaigns
    }
    
    // For active campaigns, always sync with blockchain even if already initialized
    if (existing && !existing.isEnded) {
      console.log(`Campaign ${campaignAddress} already initialized with progress: ${existing.progress}%, syncing with blockchain...`);
    }
    
    // Convert ETH goal to USD at campaign creation
    const goalUSD = await this.convertEthToUSD(goalInEth);
    
    let initialTotalRaisedUSD = '0';
    let initialProgress = 0;
    
    // For active campaigns, try to recover progress from blockchain
    if (isActive && provider) {
      try {
        const campaignAbi = [
          "function getTotalBalance() view returns (tuple(uint256 eth, address[] tokens, uint256[] amounts))",
          "function goal() view returns (uint256)"
        ];
        
        const campaignContract = new ethers.Contract(campaignAddress, campaignAbi, provider);
        
        // Get the total balance (same as Campaign Balances section)
        const totalBalance = await campaignContract.getTotalBalance();
        const totalRaisedEth = ethers.formatEther(totalBalance.eth);
        
        // Get all token balances for complete tracking
        const syntheticDonations: DonationRecord[] = [];
        let totalUSDValue = 0;
        
        // Add ETH donations if any
        if (parseFloat(totalRaisedEth) > 0) {
          const ethUSDValue = await this.convertEthToUSD(totalRaisedEth);
          syntheticDonations.push({
            amount: totalRaisedEth,
            token: 'ETH',
            usdValue: ethUSDValue,
            timestamp: Date.now(),
            txHash: 'BLOCKCHAIN_RECOVERY_ETH'
          });
          totalUSDValue += parseFloat(ethUSDValue);
        }
        
        // Add token donations (USDC, FLW) if any
        if (totalBalance.tokens && totalBalance.tokens.length > 0) {
          const usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54BdA02913'; // Base USDC
          const flwAddress = '0x84Ae3089F87CC1baa19586bB4C4059c7d24c648E'; // FLW token
          
          for (let i = 0; i < totalBalance.tokens.length; i++) {
            const tokenAddress = totalBalance.tokens[i];
            const tokenAmount = totalBalance.amounts[i];
            
            if (tokenAddress.toLowerCase() === usdcAddress.toLowerCase()) {
              // USDC (6 decimals)
              const usdcAmount = ethers.formatUnits(tokenAmount, 6);
              if (parseFloat(usdcAmount) > 0) {
                const usdcUSDValue = await this.convertToUSD(usdcAmount, 'USDC');
                syntheticDonations.push({
                  amount: usdcAmount,
                  token: 'USDC',
                  usdValue: usdcUSDValue,
                  timestamp: Date.now(),
                  txHash: 'BLOCKCHAIN_RECOVERY_USDC'
                });
                totalUSDValue += parseFloat(usdcUSDValue);
              }
            } else if (tokenAddress.toLowerCase() === flwAddress.toLowerCase()) {
              // FLW (18 decimals)
              const flwAmount = ethers.formatUnits(tokenAmount, 18);
              if (parseFloat(flwAmount) > 0) {
                const flwUSDValue = await this.convertToUSD(flwAmount, 'FLW');
                syntheticDonations.push({
                  amount: flwAmount,
                  token: 'FLW',
                  usdValue: flwUSDValue,
                  timestamp: Date.now(),
                  txHash: 'BLOCKCHAIN_RECOVERY_FLW'
                });
                totalUSDValue += parseFloat(flwUSDValue);
              }
            }
          }
        }
        
        // Create progress if we have any donations
        if (syntheticDonations.length > 0) {
          initialTotalRaisedUSD = totalUSDValue.toString();
          initialProgress = Math.round((totalUSDValue / parseFloat(goalUSD)) * 100 * 100) / 100;
          
          const progress: CampaignProgress = {
            goalUSD,
            goalETH: goalInEth,
            donations: syntheticDonations,
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
    
    // For ended campaigns, use the locked final ETH amount if available
    if (progress.isEnded && progress.finalTokenBalances?.ETH) {
      console.log(`Using locked final ETH amount: ${progress.finalTokenBalances.ETH} ETH`);
      return progress.finalTokenBalances.ETH;
    }
    
    // For ended campaigns without finalTokenBalances, use the locked USD amount converted to ETH
    if (progress.isEnded) {
      const lockedETH = await this.convertUSDToEth(progress.totalRaisedUSD);
      return lockedETH;
    }
    
    // For active campaigns, calculate ETH total from actual ETH donations
    let totalETH = 0;
    for (const donation of progress.donations) {
      if (donation.token === 'ETH') {
        totalETH += parseFloat(donation.amount);
      }
    }
    
    return totalETH.toFixed(6);
  }

  // Get final token balances for ended campaigns
  static getFinalTokenBalances(campaignAddress: string): { [token: string]: string } | null {
    const progress = this.getCampaignProgress(campaignAddress);
    if (!progress || !progress.isEnded) return null;
    
    return progress.finalTokenBalances || null;
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
        console.log(`Campaign ${campaignAddress} ended - locking total balance at ${currentRaisedInEth} ETH`);
      }
      this.saveCampaignProgress(campaignAddress, newProgress);
    } else if (progress.isEnded) {
      // Progress is locked, don't update
      console.log(`Campaign ${campaignAddress} progress is locked - preserving final balance`);
      return;
    } else {
      // For active campaigns, update with current blockchain data
      const currentRaisedUSD = await this.convertEthToUSD(currentRaisedInEth);
      const blockchainRaisedUSD = parseFloat(currentRaisedUSD);
      const trackedRaisedUSD = parseFloat(progress.totalRaisedUSD);
      
      // Always update active campaigns with latest blockchain data
      if (blockchainRaisedUSD !== trackedRaisedUSD) {
        progress.totalRaisedUSD = currentRaisedUSD;
        progress.progress = Math.round((blockchainRaisedUSD / parseFloat(progress.goalUSD)) * 100 * 100) / 100;
        this.saveCampaignProgress(campaignAddress, progress);
        console.log(`Updated active campaign ${campaignAddress} with ${currentRaisedInEth} ETH`);
      }
      
      // Mark as ended if blockchain shows inactive and lock the final balance
      if (!isActive && !progress.isEnded) {
        progress.isEnded = true;
        progress.endTimestamp = Date.now();
        
        // CRITICAL: Re-calculate final balance to ensure we capture the exact end state
        // For ended campaigns, we need to capture all token balances, not just ETH
        const finalTokenBalances: { [token: string]: string } = {};
        let totalFinalUSD = 0;
        
        // Calculate final USD value from all donations recorded
        for (const donation of progress.donations) {
          totalFinalUSD += parseFloat(donation.usdValue);
          if (!finalTokenBalances[donation.token]) {
            finalTokenBalances[donation.token] = '0';
          }
          finalTokenBalances[donation.token] = (parseFloat(finalTokenBalances[donation.token]) + parseFloat(donation.amount)).toString();
        }
        
        // Lock the final balance and progress
        progress.totalRaisedUSD = totalFinalUSD.toString();
        progress.progress = Math.round((totalFinalUSD / parseFloat(progress.goalUSD)) * 100 * 100) / 100;
        
        // Store the final token balances for reference
        progress.finalETHAmount = currentRaisedInEth;
        progress.finalTokenBalances = finalTokenBalances;
        
        this.saveCampaignProgress(campaignAddress, progress);
        
        // Enhanced logging with all token balances
        const tokenSummary = Object.entries(finalTokenBalances)
          .map(([token, amount]) => `${amount} ${token}`)
          .join(', ');
        console.log(`🔒 Campaign ${campaignAddress} ENDED - LOCKED final balance: ${tokenSummary} (${totalFinalUSD.toFixed(2)} USD, ${progress.progress}%)`);
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

  // Force refresh campaign data (clear cache and re-sync)
  static clearCampaignData(campaignAddress: string): void {
    const key = CAMPAIGN_PROGRESS_KEY + campaignAddress;
    localStorage.removeItem(key);
    console.log(`Cleared cached data for campaign ${campaignAddress}`);
  }
}
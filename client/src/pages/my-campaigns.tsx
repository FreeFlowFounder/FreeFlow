import { useState, useEffect } from 'react';
import { Plus, Edit, TrendingUp, Users, DollarSign, Clock, Target } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PageContainer } from '@/components/page-container';
import { useWallet } from '@/hooks/use-wallet';
import { Campaign } from '@/types/campaign';

import { ethers } from 'ethers';
import { getCampaignContract } from '@/lib/contracts';
// @ts-ignore
import { getAddress } from '../lib/contract-config.js';
import { ProgressTracker } from '../lib/progress-tracker';

export default function MyCampaigns() {
  const { wallet } = useWallet();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (wallet) {
      fetchMyCampaigns();
    } else {
      setCampaigns([]);
      setLoading(false);
    }
  }, [wallet]);

  const fetchMyCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!wallet) return;

      // Use simple provider like old frontend
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const currentUser = await signer.getAddress();

      const factoryAbi = [
        "function getAllCampaigns() view returns (address[])"
      ];

      const factory = new ethers.Contract(
        getAddress("CampaignFactory"), 
        factoryAbi, 
        provider
      );
      
      const campaignAddresses = await factory.getAllCampaigns();
      
      // Reverse the addresses so newest campaigns (end of array) are processed first
      const reversedAddresses = [...campaignAddresses].reverse();
      
      // Use exact ABI from old frontend
      const campaignAbi = [
        "function title() view returns (string)",
        "function imageUrl() view returns (string)",
        "function deadline() view returns (uint256)",
        "function owner() view returns (address)",
        "function goal() view returns (uint256)",
        "function getTotalBalance() view returns (uint256,uint256)",
        "function getWithdrawableAmount() view returns (uint256,uint256)",
        "function getFeeBalances() view returns (uint256,uint256)"
      ];
      
      const erc20Abi = [
        "function balanceOf(address) view returns (uint256)"
      ];

      // Process campaigns one by one to avoid rate limiting
      const myCampaigns: Campaign[] = [];
      for (let i = 0; i < reversedAddresses.length; i++) {
        const address = reversedAddresses[i];
        try {
          const campaignContract = new ethers.Contract(address, campaignAbi, provider);
          
          // Check if this is a valid campaign contract first
          let owner;
          try {
            owner = await campaignContract.owner();
          } catch (error) {
            console.log(`Skipping invalid campaign contract at ${address}:`, error instanceof Error ? error.message : 'Unknown error');
            continue;
          }
          
          // Only include campaigns owned by the current wallet (like old frontend)
          if (owner.toLowerCase() !== currentUser.toLowerCase()) {
            continue;
          }

          // Fetch data with error handling for each field
          let title, imageUrl, deadline, goal, ethAvailable;
          
          try {
            title = await campaignContract.title();
            if (!title || title.trim() === '') {
              console.log(`Campaign ${address} has empty title, skipping`);
              continue;
            }
          } catch (error) {
            console.log(`Failed to get title for campaign ${address}:`, error instanceof Error ? error.message : 'Unknown error');
            continue;
          }
          
          try {
            imageUrl = await campaignContract.imageUrl();
          } catch (error) {
            console.log(`Failed to get imageUrl for campaign ${address}, using default`);
            imageUrl = '';
          }
          
          try {
            deadline = await campaignContract.deadline();
            goal = await campaignContract.goal();
          } catch (error) {
            console.log(`Failed to get basic campaign data for ${address}:`, error instanceof Error ? error.message : 'Unknown error');
            continue;
          }

          const goalInEth = ethers.formatEther(goal);
          
          const deadlineNum = Number(deadline);
          const isActive = deadlineNum * 1000 > Date.now();
          
          // Get blockchain data using getTotalBalance() method (consistent with other components)
          let blockchainRaised = '0';
          try {
            const totalBalance = await campaignContract.getTotalBalance();
            const ethBalance = ethers.formatEther(totalBalance[0]); // ethBalance is first return value
            
            // Only include FLW balance if enabled
            const flwEnabled = import.meta.env.VITE_ALLOW_FLW === 'true';
            let totalUSDValue = 0;
            
            // Convert ETH to USD
            if (parseFloat(ethBalance) > 0) {
              const ethUSDValue = await ProgressTracker.convertEthToUSD(ethBalance);
              totalUSDValue += parseFloat(ethUSDValue);
            }
            
            // Add USDC value by querying USDC contract directly
            const usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54BdA02913'; // Base USDC
            try {
              const usdcContract = new ethers.Contract(usdcAddress, erc20Abi, provider);
              const usdcBalance = await usdcContract.balanceOf(address);
              const usdcAmount = ethers.formatUnits(usdcBalance, 6); // USDC has 6 decimals
              
              if (parseFloat(usdcAmount) > 0) {
                const usdcUSDValue = await ProgressTracker.convertToUSD(usdcAmount, 'USDC');
                totalUSDValue += parseFloat(usdcUSDValue);
              }
            } catch (error) {
              console.log(`Failed to fetch USDC balance for ${address}:`, error);
            }
            
            // Add FLW value if enabled
            if (flwEnabled) {
              const flwBalance = ethers.formatEther(totalBalance[1]); // flwBalance is second return value
              if (parseFloat(flwBalance) > 0) {
                const flwUSDValue = await ProgressTracker.convertToUSD(flwBalance, 'FLW');
                totalUSDValue += parseFloat(flwUSDValue);
              }
            }
            
            blockchainRaised = ethBalance; // Use ETH as base for progress tracking
            console.log(`My Campaigns: Campaign ${address} blockchain balance: ${blockchainRaised} ETH${flwEnabled ? ` (Total USD: $${totalUSDValue.toFixed(2)})` : ''}`);
          } catch (error) {
            console.log(`Failed to get getTotalBalance for ${address}:`, error instanceof Error ? error.message : 'Unknown error');
            // Fallback to withdrawable amount
            try {
              [ethAvailable] = await campaignContract.getWithdrawableAmount();
              blockchainRaised = ethers.formatEther(ethAvailable);
            } catch (fallbackError) {
              console.log(`Fallback getWithdrawableAmount also failed for ${address}:`, fallbackError instanceof Error ? fallbackError.message : 'Unknown error');
              blockchainRaised = '0';
            }
          }
          
          // Sync with progress tracker
          await ProgressTracker.syncWithBlockchain(address, goalInEth, blockchainRaised, isActive);
          
          // Get progress from tracker (this will be locked for ended campaigns)
          const raisedInEth = await ProgressTracker.getTotalRaisedETH(address);
          const progress = ProgressTracker.getProgressPercentage(address);
          const goalMet = progress >= 100;
          const endDate = new Date(deadlineNum * 1000);
          const now = new Date();
          
          const timeLeft = isActive ? 
            Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) + ' days left' :
            'Ended';
          
          const status: 'active' | 'ended' | 'goal_met' = 
            !isActive ? 'ended' : 
            goalMet ? 'goal_met' : 
            'active';

          const campaign = {
            id: address, // Use contract address as ID for proper routing
            title,
            description: `Campaign created by ${owner.slice(0, 6)}...${owner.slice(-4)}`,
            goal: goalInEth,
            raised: raisedInEth,
            creator: owner,
            contractAddress: address,
            imageUrl: imageUrl || undefined,
            duration: Math.ceil((deadlineNum * 1000 - Date.now()) / (1000 * 60 * 60 * 24)),
            endDate: endDate.toISOString(),
            isActive,
            acceptedTokens: ['ETH', 'USDC'],
            createdAt: i.toString(), // Use index as proxy for creation order (lower = newer since we reversed)
            progress,
            timeLeft,
            status,
          } as Campaign;
          
          myCampaigns.push(campaign);
          
          // Add small delay to avoid rate limiting
          if (i < campaignAddresses.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (err) {
          console.warn(`Skipping campaign (could not load): ${address}`, err);
        }
      }

      // Sort campaigns by creation order (newest first)
      const sortedCampaigns = myCampaigns.sort((a, b) => {
        const aCreated = parseInt(a.createdAt);
        const bCreated = parseInt(b.createdAt);
        return aCreated - bCreated; // Lower index = newer since we reversed
      });
      
      setCampaigns(sortedCampaigns);
      
    } catch (err) {
      console.error('Failed to fetch my campaigns:', err);
      setError('Failed to load your campaigns. Please check your wallet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (contractAddress: string) => {
    if (!wallet) return;
    
    try {
      setWithdrawing(true);
      
      const campaignContract = getCampaignContract(contractAddress, wallet);
      const tx = await campaignContract.withdraw();
      
      console.log('Withdraw transaction:', tx);
      
      // Refresh campaigns after withdrawal
      fetchMyCampaigns();
      
    } catch (error) {
      console.error('Withdrawal failed:', error);
      setError('Failed to withdraw funds: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setWithdrawing(false);
    }
  };



  if (!wallet) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <PageContainer>
          <div className="text-center max-w-md mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">My Campaigns</h1>
            <p className="text-gray-600 mb-8">
              Please connect your wallet to view your campaigns
            </p>
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Connect your wallet to get started</p>
            </div>
          </div>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <PageContainer>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 sm:mb-0">My Campaigns</h1>
          <Link href="/create">
            <Button className="bg-freeflow-900 hover:bg-freeflow-800 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create New Campaign
            </Button>
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-freeflow-600 mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg">Loading your campaigns...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg border border-red-200 p-8 max-w-md mx-auto">
              <h3 className="text-lg font-medium text-red-900 mb-2">Error loading campaigns</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchMyCampaigns} variant="outline" size="sm">
                Try again
              </Button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {!loading && !error && campaigns.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Raised</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.reduce((total, campaign) => total + parseFloat(campaign.raised), 0).toFixed(3)} ETH
                </div>
                <p className="text-xs text-muted-foreground">
                  Across {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.filter(c => c.isActive).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {campaigns.filter(c => !c.isActive).length} completed
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Progress</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.length > 0 ? Math.round(campaigns.reduce((total, campaign) => total + campaign.progress, 0) / campaigns.length) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Overall completion rate
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Campaigns List */}
        {!loading && !error && campaigns.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md mx-auto">
              <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
              <p className="text-gray-600 mb-6">
                Create your first campaign to start raising funds for your cause
              </p>
              <Link href="/create">
                <Button className="bg-freeflow-900 hover:bg-freeflow-800 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && campaigns.length > 0 && (
          <div className="grid gap-6">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="overflow-hidden">
                <div className="flex">
                  {campaign.imageUrl && (
                    <div className="w-48 h-32 flex-shrink-0">
                      <img 
                        src={campaign.imageUrl} 
                        alt={campaign.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                            {campaign.title}
                          </h3>
                          <Badge variant={campaign.status === 'active' ? 'default' : campaign.status === 'ended' ? 'secondary' : 'outline'}>
                            {campaign.status === 'active' ? 'Active' : campaign.status === 'ended' ? 'Ended' : 'Goal Met'}
                          </Badge>
                        </div>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {campaign.description}
                        </p>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Progress</span>
                            <span className="font-medium">{campaign.progress}%</span>
                          </div>
                          <Progress value={campaign.progress} className="h-2" />
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">
                              {campaign.raised} ETH raised of {campaign.goal} ETH
                            </span>
                            <span className="text-gray-500">{campaign.timeLeft}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        <Link href={`/campaign/${campaign.contractAddress}`}>
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </Link>
                        {campaign.status === 'ended' && parseFloat(campaign.raised) > 0 && (
                          <Button 
                            onClick={() => handleWithdraw(campaign.contractAddress)}
                            disabled={withdrawing}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <DollarSign className="w-4 h-4 mr-2" />
                            {withdrawing ? 'Withdrawing...' : 'Withdraw'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </PageContainer>
    </div>
  );
}
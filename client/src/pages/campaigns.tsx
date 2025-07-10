import { useState, useEffect } from 'react';
import { Search, RefreshCw, Plus, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageContainer } from '@/components/page-container';
import { CampaignCard } from '@/components/campaign-card';
import { CampaignDetailModal } from '@/components/campaign-detail-modal';
import { Campaign } from '@/types/campaign';
import { ethers } from 'ethers';
import { Link } from 'wouter';
import { getAddress } from '../lib/contract-config';
import { ProgressTracker } from '../lib/progress-tracker';

// Helper function to format time left
function formatTimeLeft(milliseconds: number): string {
  const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
  const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) {
    return `${days} days left`;
  } else if (hours > 0) {
    return `${hours} hours left`;
  } else {
    return 'Less than 1 hour left';
  }
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [allCampaignAddresses, setAllCampaignAddresses] = useState<string[]>([]);
  const [sortedAddresses, setSortedAddresses] = useState<string[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'ended'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'ending_soon' | 'closest_to_goal'>('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaignsToShow, setCampaignsToShow] = useState(5);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    
    // Set up automatic refresh every 60 seconds
    const interval = setInterval(() => {
      fetchCampaigns();
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);



  // Don't refetch campaigns when sort method changes - just re-sort existing campaigns
  useEffect(() => {
    if (allCampaignAddresses.length > 0 && campaigns.length > 0) {
      // Re-sort existing campaigns instead of refetching
      const sortedCampaigns = [...campaigns].sort((a, b) => {
        switch (sortBy) {
          case 'newest':
            // Since we use startIndex + i as createdAt (where 0 is newest), lower numbers = newer
            return parseInt(a.createdAt) - parseInt(b.createdAt);
          case 'ending_soon':
            const aDeadline = new Date(a.endDate).getTime();
            const bDeadline = new Date(b.endDate).getTime();
            const now = Date.now();
            const aIsActive = aDeadline > now;
            const bIsActive = bDeadline > now;
            
            if (aIsActive && !bIsActive) return -1;
            if (!aIsActive && bIsActive) return 1;
            return aIsActive ? aDeadline - bDeadline : bDeadline - aDeadline;
          case 'closest_to_goal':
            return b.progress - a.progress;
          default:
            return 0;
        }
      });
      setCampaigns(sortedCampaigns);
    }
  }, [sortBy]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Starting to fetch campaigns...');
      console.log('Current network from ENV:', import.meta.env.VITE_NETWORK);
      console.log('All env vars:', {
        VITE_NETWORK: import.meta.env.VITE_NETWORK,
        VITE_ALLOW_FLW: import.meta.env.VITE_ALLOW_FLW,
        VITE_OWNER_ADDRESS: import.meta.env.VITE_OWNER_ADDRESS
      });
      
      // Create provider that works without wallet connection
      let provider;
      if (window.ethereum) {
        console.log('Using wallet provider');
        provider = new ethers.BrowserProvider(window.ethereum);
      } else {
        // Multiple RPC endpoints for better reliability
        // Mobile browsers prefer different RPC endpoints due to CORS policies
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        const rpcUrls = import.meta.env.VITE_NETWORK === 'mainnet' 
          ? isMobile 
            ? [
                'https://base.publicnode.com',
                'https://base-mainnet.g.alchemy.com/v2/demo',
                'https://mainnet.base.org'
              ]
            : [
                'https://mainnet.base.org',
                'https://base-mainnet.g.alchemy.com/v2/demo',
                'https://base.publicnode.com'
              ]
          : [
              'https://sepolia.base.org',
              'https://base-sepolia.g.alchemy.com/v2/demo'
            ];
        
        console.log('Trying RPC providers:', rpcUrls);
        
        // Try each RPC endpoint until one works (with mobile-friendly timeouts)
        let workingProvider = null;
        for (const rpcUrl of rpcUrls) {
          try {
            console.log('Trying RPC:', rpcUrl);
            const testProvider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
              staticNetwork: true,
              batchMaxCount: 1,
              batchMaxSize: 1024,
              polling: false
            });
            
            // Test connection with timeout for mobile
            const networkPromise = testProvider.getNetwork();
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 8000)
            );
            
            await Promise.race([networkPromise, timeoutPromise]);
            workingProvider = testProvider;
            console.log('Successfully connected to:', rpcUrl);
            break;
          } catch (e) {
            console.log('RPC failed:', rpcUrl, e instanceof Error ? e.message : 'Unknown error');
          }
        }
        
        if (!workingProvider) {
          throw new Error('All RPC endpoints failed. Please check your internet connection.');
        }
        
        provider = workingProvider;
      }
      
      const factoryAbi = ["function getAllCampaigns() view returns (address[])"];
      const factoryAddress = getAddress("CampaignFactory");
      console.log('Factory address:', factoryAddress);
      console.log('Environment:', import.meta.env.VITE_NETWORK);
      console.log('User agent:', navigator.userAgent);
      console.log('Is mobile:', /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
      
      // Check network - this is critical for mobile debugging
      try {
        const network = await provider.getNetwork();
        console.log('Connected to network:', network.name, 'Chain ID:', network.chainId);
        
        // Base mainnet should be chainId 8453
        if (import.meta.env.VITE_NETWORK === 'mainnet' && network.chainId !== BigInt(8453)) {
          console.error('NETWORK MISMATCH: Expected Base mainnet (8453), got:', network.chainId);
          throw new Error(`Network mismatch: Expected Base mainnet (chainId 8453), but connected to chainId ${network.chainId}`);
        }
      } catch (e) {
        console.error('Could not get network info:', e);
        throw e;
      }
      
      const factory = new ethers.Contract(factoryAddress, factoryAbi, provider);
      
      // Check if the contract exists at this address
      console.log('Checking contract code at factory address...');
      try {
        const factoryCode = await provider.getCode(factoryAddress);
        console.log('Factory contract code length:', factoryCode.length);
        console.log('Factory contract code preview:', factoryCode.substring(0, 100) + '...');
        
        if (factoryCode === '0x') {
          // Try alternative RPC for mobile if main one fails
          const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
          if (isMobile) {
            console.log('Mobile browser: trying alternative RPC for contract verification...');
            const altProvider = new ethers.JsonRpcProvider('https://base-mainnet.g.alchemy.com/v2/demo');
            const altFactoryCode = await altProvider.getCode(factoryAddress);
            console.log('Alternative RPC contract code length:', altFactoryCode.length);
            
            if (altFactoryCode !== '0x') {
              console.log('Contract found on alternative RPC, switching provider...');
              provider = altProvider;
            } else {
              throw new Error(`No contract found at factory address ${factoryAddress}. Please verify the contract is deployed on ${import.meta.env.VITE_NETWORK}.`);
            }
          } else {
            throw new Error(`No contract found at factory address ${factoryAddress}. Please verify the contract is deployed on ${import.meta.env.VITE_NETWORK}.`);
          }
        }
      } catch (e) {
        console.error('Error checking contract code:', e);
        throw e;
      }
      
      console.log('Calling getAllCampaigns...');
      const campaignAddresses = await factory.getAllCampaigns();
      console.log('Campaign addresses returned:', campaignAddresses.length);
      console.log('Campaign addresses:', campaignAddresses);
      
      setAllCampaignAddresses(campaignAddresses);
      
      if (campaignAddresses.length === 0) {
        setCampaigns([]);
        return;
      }
      
      // Reverse the addresses so newest campaigns (end of array) load first
      const reversedAddresses = [...campaignAddresses].reverse();
      setSortedAddresses(reversedAddresses);
      await loadCampaignBatch(reversedAddresses, 0, campaignsToShow);
      
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
      console.error('Error details:', err);
      setError(`Failed to load campaigns: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadCampaignBatch = async (addresses: string[], startIndex: number, count: number) => {
    // Use same provider logic as fetchCampaigns
    let provider;
    if (window.ethereum) {
      provider = new ethers.BrowserProvider(window.ethereum);
    } else {
      // Use the fastest RPC for mobile
      const rpcUrl = import.meta.env.VITE_NETWORK === 'mainnet' 
        ? 'https://base.publicnode.com'
        : 'https://sepolia.base.org';
      provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
        staticNetwork: true,
        batchMaxCount: 1,
        batchMaxSize: 1024,
        polling: false
      });
    }
    
    const campaignAbi = [
      "function title() view returns (string)",
      "function imageUrl() view returns (string)",
      "function deadline() view returns (uint256)",
      "function owner() view returns (address)",
      "function goal() view returns (uint256)",
      "function getWithdrawableAmount() view returns (uint256,uint256)",
      "function getFeeBalances() view returns (uint256,uint256)"
    ];

    const newCampaigns: Campaign[] = [];
    const endIndex = Math.min(startIndex + count, addresses.length);
    
    for (let i = startIndex; i < endIndex; i++) {
      const address = addresses[i];
      console.log(`Loading campaign ${i + 1}/${endIndex}: ${address.slice(0,8)}...`);
      
      try {
        const campaignContract = new ethers.Contract(address, campaignAbi, provider);
        
        // First check if this is a valid campaign contract
        let owner;
        try {
          owner = await campaignContract.owner();
        } catch (error) {
          console.log(`Skipping invalid campaign contract at ${address}:`, error instanceof Error ? error.message : 'Unknown error');
          continue;
        }
        
        // Get other data with error handling
        let title, imageUrl, deadline, goal;
        
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
          [imageUrl, deadline, goal] = await Promise.all([
            campaignContract.imageUrl().catch(() => ''),
            campaignContract.deadline(),
            campaignContract.goal()
          ]);
        } catch (error) {
          console.log(`Failed to get basic campaign data for ${address}:`, error instanceof Error ? error.message : 'Unknown error');
          continue;
        }
        
        const deadlineNum = Number(deadline);
        const isActive = deadlineNum * 1000 > Date.now();
        
        // Get campaign progress using frontend tracker
        const goalInEth = ethers.formatEther(goal);
        
        // Get current blockchain data for sync
        let blockchainRaised = '0';
        if (isActive) {
          // For active campaigns, use current withdrawable amount
          const withdrawableResult = await campaignContract.getWithdrawableAmount();
          const [ethAvailable] = withdrawableResult;
          blockchainRaised = ethers.formatEther(ethAvailable);
        } else {
          // For ended campaigns, try to get total raised (withdrawable + fees)
          try {
            const [withdrawableResult, feeResult] = await Promise.all([
              campaignContract.getWithdrawableAmount(),
              campaignContract.getFeeBalances()
            ]);
            const [ethWithdrawable] = withdrawableResult;
            const [ethFees] = feeResult;
            
            const totalRaised = BigInt(ethWithdrawable) + BigInt(ethFees);
            blockchainRaised = ethers.formatEther(totalRaised);
          } catch (error) {
            console.warn('Could not get blockchain data for ended campaign:', error);
            const contractBalance = await provider.getBalance(address);
            blockchainRaised = ethers.formatEther(contractBalance);
          }
        }
        
        // Sync with progress tracker
        await ProgressTracker.syncWithBlockchain(address, goalInEth, blockchainRaised, isActive);
        
        // Get progress from tracker (this will be locked for ended campaigns)
        const raisedInEth = await ProgressTracker.getTotalRaisedETH(address);
        const progress = ProgressTracker.getProgressPercentage(address);
        const goalMet = progress >= 100;
        const endDate = new Date(deadlineNum * 1000);
        
        const timeLeft = isActive ? 
          formatTimeLeft(endDate.getTime() - Date.now()) :
          'Ended';
        
        const status: 'active' | 'ended' | 'goal_met' = 
          !isActive ? 'ended' : 
          goalMet ? 'goal_met' : 
          'active';

        const campaign = {
          id: address,
          title,
          description: `Campaign by ${owner.slice(0, 6)}...${owner.slice(-4)}`,
          goal: goalInEth,
          raised: raisedInEth,
          creator: owner,
          contractAddress: address,
          imageUrl: imageUrl || undefined,
          duration: Math.ceil((deadlineNum * 1000 - Date.now()) / (1000 * 60 * 60 * 24)),
          endDate: endDate.toISOString(),
          isActive,
          acceptedTokens: ['ETH', 'USDC'],
          createdAt: (startIndex + i).toString(), // Use actual position in reversed array as creation order
          progress,
          timeLeft,
          status,
        } as Campaign;
        
        newCampaigns.push(campaign);
        
        // Small delay between campaigns
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.warn(`Skipping campaign (could not load): ${address}`, err);
      }
    }

    if (startIndex === 0) {
      setCampaigns(newCampaigns);
    } else {
      setCampaigns(prev => [...prev, ...newCampaigns]);
    }
    
    console.log(`Loaded ${newCampaigns.length} campaigns (batch ${startIndex}-${endIndex})`);
  };

  const loadMoreCampaigns = async () => {
    if (loadingMore || campaigns.length >= allCampaignAddresses.length) return;
    
    setLoadingMore(true);
    try {
      await loadCampaignBatch(sortedAddresses, campaigns.length, 5);
      setCampaignsToShow(prev => prev + 5);
    } catch (err) {
      console.error('Failed to load more campaigns:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCampaignClick = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCampaign(null);
  };

  // Filter and sort campaigns
  const now = Date.now();
  const filteredCampaigns = campaigns
    .filter(campaign => {
      const matchesSearch = campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           campaign.creator.toLowerCase().includes(searchTerm.toLowerCase());
      
      const campaignDeadline = new Date(campaign.endDate).getTime();
      switch (filter) {
        case 'active':
          return matchesSearch && campaignDeadline > now;
        case 'ended':
          return matchesSearch && campaignDeadline <= now;
        default:
          return matchesSearch;
      }
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          // Since we use startIndex + i as createdAt (where 0 is newest), lower numbers = newer
          const aCreated = parseInt(a.createdAt);
          const bCreated = parseInt(b.createdAt);
          return aCreated - bCreated; // Lower number = newer
        
        case 'ending_soon':
          // Sort by deadline (ending soonest first, but only for active campaigns)
          const aDeadline = new Date(a.endDate).getTime();
          const bDeadline = new Date(b.endDate).getTime();
          const aIsActive = aDeadline > now;
          const bIsActive = bDeadline > now;
          
          // Active campaigns come first, then ended ones
          if (aIsActive && !bIsActive) return -1;
          if (!aIsActive && bIsActive) return 1;
          
          // Among active campaigns, sort by deadline (soonest first)
          // Among ended campaigns, sort by deadline (most recent first)
          return aIsActive ? aDeadline - bDeadline : bDeadline - aDeadline;
        
        case 'closest_to_goal':
          return b.progress - a.progress;
        
        default:
          return 0;
      }
    });

  return (
    <PageContainer>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Browse Campaigns</h1>
            <p className="text-muted-foreground mt-1">
              Discover and support meaningful causes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCampaigns}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Link href="/create-campaign">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </Link>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns or creators..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={(value: 'all' | 'active' | 'ended') => setFilter(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="ended">Ended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: 'newest' | 'ending_soon' | 'closest_to_goal') => setSortBy(value)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="ending_soon">Ending Soon</SelectItem>
                <SelectItem value="closest_to_goal">Closest to Goal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {loading && campaigns.length === 0 ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-4">Loading campaigns...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive">{error}</p>
              <Button
                variant="outline"
                onClick={fetchCampaigns}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No campaigns found matching your criteria.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try adjusting your search or filter options.
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredCampaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onClick={() => handleCampaignClick(campaign)}
                  />
                ))}
              </div>
              
              {/* Load More Button */}
              {campaigns.length < allCampaignAddresses.length && (
                <div className="text-center py-8">
                  <Button
                    variant="outline"
                    onClick={loadMoreCampaigns}
                    disabled={loadingMore}
                    className="min-w-32"
                  >
                    {loadingMore ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    Showing {campaigns.length} of {allCampaignAddresses.length} campaigns
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Campaign Detail Modal */}
      <CampaignDetailModal
        campaign={selectedCampaign}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </PageContainer>
  );
}
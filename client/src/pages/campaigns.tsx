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
            return parseInt(b.createdAt) - parseInt(a.createdAt);
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
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const factoryAbi = ["function getAllCampaigns() view returns (address[])"];
      const factoryAddress = getAddress("CampaignFactory");
      const factory = new ethers.Contract(factoryAddress, factoryAbi, provider);
      
      const campaignAddresses = await factory.getAllCampaigns();
      console.log('Campaign addresses returned:', campaignAddresses.length);
      
      setAllCampaignAddresses(campaignAddresses);
      
      if (campaignAddresses.length === 0) {
        setCampaigns([]);
        return;
      }
      
      // Load all campaigns first, then sort them properly
      setSortedAddresses(campaignAddresses);
      await loadCampaignBatch(campaignAddresses, 0, campaignsToShow);
      
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
      setError('Failed to load campaigns. Please check your wallet connection.');
    } finally {
      setLoading(false);
    }
  };

  const loadCampaignBatch = async (addresses: string[], startIndex: number, count: number) => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const campaignAbi = [
      "function title() view returns (string)",
      "function imageUrl() view returns (string)",
      "function deadline() view returns (uint256)",
      "function campaignOwner() view returns (address)",
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
        
        const [title, imageUrl, deadline, owner, goal] = await Promise.all([
          campaignContract.title(),
          campaignContract.imageUrl().catch(() => ''),
          campaignContract.deadline(), 
          campaignContract.campaignOwner(),
          campaignContract.goal()
        ]);
        
        const deadlineNum = Number(deadline);
        const isActive = deadlineNum * 1000 > Date.now();
        
        // Get campaign progress
        let raisedInEth = '0';
        let progress = 0;
        
        const goalInEth = ethers.formatEther(goal);
        
        if (isActive) {
          // For active campaigns, use current withdrawable amount
          const withdrawableResult = await campaignContract.getWithdrawableAmount();
          const [ethAvailable] = withdrawableResult;
          raisedInEth = ethers.formatEther(ethAvailable);
          progress = Math.round((parseFloat(raisedInEth) / parseFloat(goalInEth) * 100) * 100) / 100;
        } else {
          // For ended campaigns, check cache first, then calculate if needed
          const cacheKey = `final_balance_${address}`;
          const cachedData = localStorage.getItem(cacheKey);
          
          if (cachedData) {
            try {
              const { balance, progress: cachedProgress } = JSON.parse(cachedData);
              raisedInEth = balance;
              progress = cachedProgress;
              console.log(`Using cached progress for ended campaign: ${progress}%`);
            } catch (cacheError) {
              console.warn('Invalid cache data, recalculating');
              // Fall through to calculation
            }
          }
          
          // If no cache or cache failed, calculate and cache the final progress
          if (!cachedData || parseFloat(raisedInEth) === 0) {
            try {
              const [withdrawableResult, feeResult] = await Promise.all([
                campaignContract.getWithdrawableAmount(),
                campaignContract.getFeeBalances()
              ]);
              const [ethWithdrawable] = withdrawableResult;
              const [ethFees] = feeResult;
              
              const totalRaised = BigInt(ethWithdrawable) + BigInt(ethFees);
              raisedInEth = ethers.formatEther(totalRaised);
              progress = Math.round((parseFloat(raisedInEth) / parseFloat(goalInEth) * 100) * 100) / 100;
              
              // Cache the final values for future use
              localStorage.setItem(cacheKey, JSON.stringify({
                balance: raisedInEth,
                progress: progress
              }));
              console.log(`Cached final progress for ended campaign: ${progress}%`);
            } catch (error) {
              console.warn('Could not calculate final progress for ended campaign:', error);
              // Fallback to contract balance
              const contractBalance = await provider.getBalance(address);
              raisedInEth = ethers.formatEther(contractBalance);
              progress = Math.round((parseFloat(raisedInEth) / parseFloat(goalInEth) * 100) * 100) / 100;
            }
          }
        }
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
          createdAt: (addresses.length - i).toString(), // Use index as proxy for creation order (higher = newer)
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
          // Sort by creation order (newest first) - use array position as proxy
          const aCreated = parseInt(a.createdAt);
          const bCreated = parseInt(b.createdAt);
          return bCreated - aCreated; // Higher number = newer
        
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
          if (aIsActive && bIsActive) {
            return aDeadline - bDeadline;
          }
          
          // Among ended campaigns, sort by most recently ended
          return bDeadline - aDeadline;
        
        case 'closest_to_goal':
          // Sort by progress percentage (closest to 100% first)
          const aProgress = parseFloat(a.raised) > 0 ? (parseFloat(a.raised) / parseFloat(a.goal)) * 100 : 0;
          const bProgress = parseFloat(b.raised) > 0 ? (parseFloat(b.raised) / parseFloat(b.goal)) * 100 : 0;
          return bProgress - aProgress;
        
        default:
          return 0;
      }
    });



  return (
    <div className="min-h-screen bg-gray-50">
      <PageContainer className="py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 sm:mb-0">Browse Campaigns</h1>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <Button
                variant={filter === 'active' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter('active')}
                className={filter === 'active' ? 'bg-white text-freeflow-900 shadow-sm' : ''}
              >
                Active
              </Button>
              <Button
                variant={filter === 'ended' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter('ended')}
                className={filter === 'ended' ? 'bg-white text-freeflow-900 shadow-sm' : ''}
              >
                Ended
              </Button>
              <Button
                variant={filter === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter('all')}
                className={filter === 'all' ? 'bg-white text-freeflow-900 shadow-sm' : ''}
              >
                All
              </Button>
            </div>
            
            <Select value={sortBy} onValueChange={(value: 'newest' | 'ending_soon' | 'closest_to_goal') => setSortBy(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest Created</SelectItem>
                <SelectItem value="ending_soon">Ending Soon</SelectItem>
                <SelectItem value="closest_to_goal">Closest to Goal</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCampaigns}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="campaign-search"
                name="campaign-search"
                type="text"
                placeholder="Search by title or creator"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 w-full sm:w-64 focus:ring-freeflow-500 focus:border-freeflow-500"
              />
            </div>
          </div>
        </div>
        
        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-freeflow-600 mx-auto mb-4"></div>
            <p className="text-gray-500 text-lg">Loading campaigns from blockchain...</p>
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div className="text-center py-12">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
              <p className="text-red-700 font-medium mb-2">Error Loading Campaigns</p>
              <p className="text-red-600 text-sm">{error}</p>
              <Button 
                onClick={fetchCampaigns}
                className="mt-4 bg-red-600 hover:bg-red-700"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}
        
        {/* Empty State */}
        {!loading && !error && filteredCampaigns.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-sm p-8 max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No matching campaigns' : 'No campaigns found'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm 
                  ? 'Try adjusting your search or filter criteria' 
                  : 'Be the first to create a campaign!'
                }
              </p>
              <Link href="/create">
                <span className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-freeflow-600 hover:bg-freeflow-700 rounded-md transition-colors cursor-pointer">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </span>
              </Link>
            </div>
          </div>
        )}
        
        {/* Campaigns Grid */}
        {!loading && !error && filteredCampaigns.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <div className="text-center mt-8">
                <Button
                  onClick={loadMoreCampaigns}
                  disabled={loadingMore}
                  variant="outline"
                  size="lg"
                  className="flex items-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Loading more...
                    </>
                  ) : (
                    <>
                      Load More Campaigns
                      <span className="text-sm text-gray-500">
                        ({campaigns.length} of {allCampaignAddresses.length})
                      </span>
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </PageContainer>
      
      <CampaignDetailModal
        campaign={selectedCampaign}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
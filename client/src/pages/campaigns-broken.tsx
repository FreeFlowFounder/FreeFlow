import { useState, useEffect } from 'react';
import { Search, TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageContainer } from '@/components/page-container';
import { CampaignCard } from '@/components/campaign-card';
import { CampaignDetailModal } from '@/components/campaign-detail-modal';
import { Campaign } from '@/types/campaign';


import { ethers } from 'ethers';
import { Link } from 'wouter';
// @ts-ignore
import { getAddress } from '../lib/contract-config.js';

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
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'ended'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaignsToShow, setCampaignsToShow] = useState(5); // Show 5 campaigns initially
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    
    // Set up automatic refresh every 60 seconds (reduced frequency)
    const interval = setInterval(() => {
      fetchCampaigns();
    }, 60000);
    
    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  const fetchCampaigns = async () => {
    try {
      // Cancel any existing load operation
      if (abortController) {
        abortController.abort();
      }
      
      const newAbortController = new AbortController();
      setAbortController(newAbortController);
      
      setLoading(true);
      setError(null);
      
      const startTime = performance.now();
      console.log('🚀 Starting to fetch campaigns...');
      
      // Use simple provider without requiring wallet connection (like old frontend)
      const provider = new ethers.BrowserProvider(window.ethereum);
      console.log('Provider created');
      
      // Use minimal ABI like the old frontend
      const factoryAbi = [
        "function getAllCampaigns() view returns (address[])"
      ];
      
      const factoryAddress = getAddress("CampaignFactory");
      console.log('Factory address:', factoryAddress);
      
      const factory = new ethers.Contract(
        factoryAddress, 
        factoryAbi, 
        provider
      );
      
      console.log('Factory contract created, calling getAllCampaigns...');
      const campaignAddresses = await factory.getAllCampaigns();
      console.log('Campaign addresses returned:', campaignAddresses.length, campaignAddresses);
      
      if (campaignAddresses.length === 0) {
        console.log('No campaigns found, completing load');
        setCampaigns([]);
        return;
      }
      
      // Use exact ABI from old frontend
      const campaignAbi = [
        "function title() view returns (string)",
        "function imageUrl() view returns (string)",
        "function deadline() view returns (uint256)",
        "function campaignOwner() view returns (address)",
        "function goal() view returns (uint256)",
        "function getWithdrawableAmount() view returns (uint256,uint256)"
      ];

      // Process campaigns with optimized sequential loading
      const campaigns = [];
      console.log(`📦 Processing ${campaignAddresses.length} campaigns with optimized loading`);
      
      for (let i = 0; i < campaignAddresses.length; i++) {
        const address = campaignAddresses[i];
        console.log(`⚡ Processing campaign ${i + 1}/${campaignAddresses.length}: ${address.slice(0,8)}...`);
        
        try {
          const campaignStartTime = performance.now();
          const campaignContract = new ethers.Contract(address, campaignAbi, provider);
          
          // Get all essential data in parallel
          const [title, imageUrl, deadline, owner, goal, withdrawableResult] = await Promise.all([
            campaignContract.title(),
            campaignContract.imageUrl().catch(() => ''),
            campaignContract.deadline(),
            campaignContract.campaignOwner(),
            campaignContract.goal(),
            campaignContract.getWithdrawableAmount()
          ]);
          
          const [ethAvailable] = withdrawableResult;
          const goalInEth = ethers.formatEther(goal);
          const raisedInEth = ethers.formatEther(ethAvailable);
          const progress = Math.round((parseFloat(raisedInEth) / parseFloat(goalInEth) * 100) * 100) / 100;
          
          const deadlineNum = Number(deadline);
          const isActive = deadlineNum * 1000 > Date.now();
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
            createdAt: new Date().toISOString(),
            progress,
            timeLeft,
            status,
          } as Campaign;
          
          campaigns.push(campaign);
          
          const campaignTime = (performance.now() - campaignStartTime) / 1000;
          console.log(`✅ Campaign ${address.slice(0,8)}... loaded in ${campaignTime.toFixed(2)}s`);
          
        } catch (err) {
          console.warn(`Skipping campaign (could not load): ${address}`, err);
        }
      }


      setCampaigns(campaigns);
      
      const endTime = performance.now();
      const loadTime = (endTime - startTime) / 1000;
      console.log(`✅ Campaign loading completed in ${loadTime.toFixed(2)} seconds`);
      console.log(`📊 Loaded ${campaigns.length} campaigns with batch processing`);
      
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.log('🚫 Campaign loading cancelled');
        return;
      }
      console.error('Failed to fetch campaigns:', err);
      setError('Failed to load campaigns. Please check your wallet connection.');
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  };

  // Filter and sort campaigns exactly like old frontend
  const now = Date.now();
  const filteredCampaigns = campaigns
    .filter(campaign => {
      // Search by title or creator (like old frontend)
      const matchesSearch = campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           campaign.creator.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by active/ended based on deadline (like old frontend)
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
      // Sort by soonest deadline first (like old frontend)
      const deadlineA = new Date(a.endDate).getTime();
      const deadlineB = new Date(b.endDate).getTime();
      return deadlineA - deadlineB;
    });

  const handleCampaignClick = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCampaign(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageContainer className="py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 sm:mb-0">Browse Campaigns</h1>
          
          {/* Filter Controls */}
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
            
            {/* Refresh Button */}
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
            
            {/* Cancel Button (shows only when loading) */}
            {loading && (
              <Button 
                onClick={() => {
                  if (abortController) {
                    abortController.abort();
                    console.log('🛑 User cancelled loading');
                  }
                }}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                Cancel
              </Button>
            )}
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
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
            <div className="bg-white rounded-lg border border-red-200 p-8 max-w-md mx-auto">
              <h3 className="text-lg font-medium text-red-900 mb-2">Error loading campaigns</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchCampaigns} variant="outline" size="sm">
                Try again
              </Button>
            </div>
          </div>
        )}

        {/* Campaign Cards */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onClick={() => handleCampaignClick(campaign)}
              />
            ))}
          </div>
        )}
        
        {/* Empty States */}
        {!loading && !error && filteredCampaigns.length === 0 && campaigns.length > 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No campaigns found matching your criteria.</p>
          </div>
        )}

        {!loading && !error && campaigns.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-md mx-auto">
              <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
              <p className="text-gray-500 mb-4">Be the first to create a campaign on FreeFlow</p>
              <Link href="/create-campaign">
                <Button size="sm">Create Campaign</Button>
              </Link>
            </div>
          </div>
        )}
        
        {filteredCampaigns.length > 0 && (
          <div className="text-center mt-12">
            <Button variant="outline" size="lg">
              Load More Campaigns
            </Button>
          </div>
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

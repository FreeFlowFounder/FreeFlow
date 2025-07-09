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

export default function MyCampaigns() {
  const { wallet } = useWallet();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
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
      
      // Use exact ABI from old frontend
      const campaignAbi = [
        "function title() view returns (string)",
        "function imageUrl() view returns (string)",
        "function deadline() view returns (uint256)",
        "function campaignOwner() view returns (address)",
        "function goal() view returns (uint256)",
        "function getWithdrawableAmount() view returns (uint256,uint256)"
      ];

      // Process campaigns one by one to avoid rate limiting
      const myCampaigns: Campaign[] = [];
      for (let i = 0; i < campaignAddresses.length; i++) {
        const address = campaignAddresses[i];
        try {
          const campaignContract = new ethers.Contract(address, campaignAbi, provider);
          
          const owner = await campaignContract.campaignOwner();
          
          // Only include campaigns owned by the current wallet (like old frontend)
          if (owner.toLowerCase() !== currentUser.toLowerCase()) {
            continue;
          }

          // Fetch data exactly like old frontend
          const title = await campaignContract.title();
          const imageUrl = await campaignContract.imageUrl();
          const deadline = await campaignContract.deadline();
          const goal = await campaignContract.goal();
          const [ethAvailable] = await campaignContract.getWithdrawableAmount();

          const goalInEth = ethers.formatEther(goal);
          
          // For active campaigns, use withdrawable amount
          // For ended campaigns, use withdrawable + fees to capture final state
          let totalDonationsReceived = ethAvailable;
          
          const deadlineNum = Number(deadline);
          const isActive = deadlineNum * 1000 > Date.now();
          
          if (!isActive) {
            // Campaign has ended - capture the final state including fees
            try {
              const [currentFees] = await campaignContract.getFeeBalances();
              totalDonationsReceived = ethAvailable + currentFees;
            } catch (error) {
              console.log('Could not get fees for ended campaign, using withdrawable amount');
            }
          }
          
          const raisedInEth = ethers.formatEther(totalDonationsReceived);
          const progress = Math.round((parseFloat(raisedInEth) / parseFloat(goalInEth) * 100) * 100) / 100;
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
            createdAt: new Date().toISOString(),
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

      setCampaigns(myCampaigns);
      
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
      setLoading(true);
      
      const campaignContract = getCampaignContract(contractAddress, wallet);
      const tx = await campaignContract.withdraw();
      
      console.log('Withdraw transaction:', tx);
      
      // Refresh campaigns after withdrawal
      fetchMyCampaigns();
      
    } catch (error) {
      console.error('Withdrawal failed:', error);
      setError('Failed to withdraw funds: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
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
                <CardTitle className="text-sm font-medium">Goal Achievement</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.length > 0 ? Math.round(campaigns.reduce((total, campaign) => total + campaign.progress, 0) / campaigns.length) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Average progress
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Campaigns List */}
        <div className="space-y-6">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {campaign.title}
                        </h3>
                        <p className="text-gray-600 line-clamp-2">
                          {campaign.description}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          className={campaign.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
                        >
                          {campaign.isActive ? 'Active' : 'Ended'}
                        </Badge>
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Raised</p>
                          <p className="font-semibold">{campaign.raised} ETH</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Goal</p>
                          <p className="font-semibold">{campaign.goal} ETH</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Progress</p>
                          <p className="font-semibold">{campaign.progress}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Time Left</p>
                          <p className="font-semibold">{campaign.timeLeft}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Progress</span>
                          <span className="text-gray-900 font-medium">{campaign.progress}%</span>
                        </div>
                        <Progress value={campaign.progress} className="h-2" />
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {campaign.acceptedTokens.map((token) => (
                        <Badge key={token} variant="outline">
                          {token}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2 lg:w-auto w-full">
                    <Link href={`/campaign/${campaign.contractAddress}`}>
                      <Button className="bg-freeflow-900 hover:bg-freeflow-800 text-white w-full">
                        View Campaign
                      </Button>
                    </Link>
                    {campaign.isActive && (
                      <Button variant="outline" className="w-full" onClick={() => handleWithdraw(campaign.contractAddress || '')}>
                        Withdraw Funds
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {!loading && !error && campaigns.length === 0 && (
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
            <p className="text-gray-500 mb-6">
              Create your first campaign to start raising funds for your cause
            </p>
            <Link href="/create">
              <Button className="bg-freeflow-900 hover:bg-freeflow-800 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Campaign
              </Button>
            </Link>
          </div>
        )}
      </PageContainer>


    </div>
  );
}

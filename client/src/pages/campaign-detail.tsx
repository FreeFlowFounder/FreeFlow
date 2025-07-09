import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { ArrowLeft, Heart, Clock, Target, Copy, Share2 } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageContainer } from '@/components/page-container';
import { BalanceDisplay } from '@/components/balance-display';
import { useWallet } from '@/hooks/use-wallet';
import { useToast } from '@/hooks/use-toast';
import { Campaign } from '@/types/campaign';
import { ethers } from 'ethers';
import { ProgressTracker } from '@/lib/progress-tracker';

export default function CampaignDetail() {
  const [, params] = useRoute('/campaign/:id');
  const { wallet } = useWallet();
  const { toast } = useToast();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [selectedToken, setSelectedToken] = useState('ETH');
  const [amount, setAmount] = useState('');
  const [isDonating, setIsDonating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updates, setUpdates] = useState<Array<{ message: string; timestamp: number }>>([]);
  const [newUpdate, setNewUpdate] = useState('');
  const [isPostingUpdate, setIsPostingUpdate] = useState(false);

  useEffect(() => {
    const fetchCampaignData = async () => {
      if (!params?.id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const contractAddress = params.id;
        
        // Use a basic provider for reading data (no wallet required)
        const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
        
        const campaignAbi = [
          "function title() view returns (string)",
          "function imageUrl() view returns (string)",
          "function deadline() view returns (uint256)",
          "function owner() view returns (address)",
          "function goal() view returns (uint256)",
          "function getWithdrawableAmount() view returns (uint256,uint256)",
          "function getFeeBalances() view returns (uint256,uint256)",
          "function getUpdateCount() view returns (uint256)",
          "function getUpdate(uint256) view returns (string, uint256)",
          "function postUpdate(string memory newUpdate)"
        ];
        
        const campaignContract = new ethers.Contract(contractAddress, campaignAbi, provider);
        
        // Fetch campaign data with error handling
        let title, imageUrl, deadline, owner, goal, ethAvailable;
        
        try {
          owner = await campaignContract.owner();
        } catch (error) {
          throw new Error(`Invalid campaign contract: ${error.message}`);
        }
        
        try {
          title = await campaignContract.title();
          if (!title || title.trim() === '') {
            throw new Error('Campaign has no title');
          }
        } catch (error) {
          throw new Error(`Failed to get campaign title: ${error.message}`);
        }
        
        try {
          [imageUrl, deadline, goal] = await Promise.all([
            campaignContract.imageUrl().catch(() => ''),
            campaignContract.deadline(),
            campaignContract.goal()
          ]);
        } catch (error) {
          throw new Error(`Failed to get basic campaign data: ${error.message}`);
        }
        
        // Try multiple approaches to get campaign balance
        ethAvailable = BigInt(0);
        
        // Method 1: Try getWithdrawableAmount() function
        try {
          const result = await campaignContract.getWithdrawableAmount();
          ethAvailable = result[0]; // First element should be ETH amount
          console.log('✅ getWithdrawableAmount() succeeded:', ethers.formatEther(ethAvailable));
        } catch (error) {
          console.log('❌ getWithdrawableAmount() failed:', error.message);
          
          // Method 2: Try direct contract balance
          try {
            const balance = await provider.getBalance(contractAddress);
            ethAvailable = balance;
            console.log('✅ Using direct contract balance:', ethers.formatEther(balance));
          } catch (balanceError) {
            console.log('❌ Direct balance check failed:', balanceError.message);
            
            // Method 3: Set to zero and continue
            ethAvailable = BigInt(0);
            console.log('⚠️ Using zero balance fallback');
          }
        }
        
        const goalInEth = ethers.formatEther(goal);
        const deadlineNum = Number(deadline);
        const isActive = deadlineNum * 1000 > Date.now();
        
        // Get blockchain data for sync
        let blockchainRaised = '0';
        if (isActive) {
          blockchainRaised = ethers.formatEther(ethAvailable);
        } else {
          // Campaign has ended - capture the final state including fees
          try {
            const feeResult = await campaignContract.getFeeBalances();
            const currentFees = feeResult[0]; // ETH fees
            const totalDonationsReceived = ethAvailable + currentFees;
            blockchainRaised = ethers.formatEther(totalDonationsReceived);
            console.log('✅ Including fees in ended campaign calculation');
          } catch (error) {
            console.log('❌ Could not get fees for ended campaign, using withdrawable amount only');
            blockchainRaised = ethers.formatEther(ethAvailable);
          }
        }
        
        // Sync with progress tracker
        await ProgressTracker.syncWithBlockchain(contractAddress, goalInEth, blockchainRaised, isActive);
        
        // Get progress from tracker (this will be locked for ended campaigns)
        const raisedInEth = await ProgressTracker.getTotalRaisedETH(contractAddress);
        const progress = ProgressTracker.getProgressPercentage(contractAddress);
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

        const campaignData: Campaign = {
          id: contractAddress,
          title,
          description: `Campaign created by ${owner.slice(0, 6)}...${owner.slice(-4)}`,
          goal: goalInEth,
          raised: raisedInEth,
          creator: owner,
          contractAddress,
          imageUrl: imageUrl || undefined,
          duration: Math.ceil((deadlineNum * 1000 - Date.now()) / (1000 * 60 * 60 * 24)),
          endDate: endDate.toISOString(),
          isActive,
          acceptedTokens: ['ETH', 'USDC'],
          createdAt: new Date().toISOString(),
          progress,
          timeLeft,
          status,
        };
        
        setCampaign(campaignData);

        // Fetch campaign updates
        try {
          const updateCount = await campaignContract.getUpdateCount();
          const campaignUpdates = [];
          
          for (let i = 0; i < Number(updateCount); i++) {
            try {
              const [message, timestamp] = await campaignContract.getUpdate(i);
              campaignUpdates.push({ message, timestamp: Number(timestamp) });
            } catch (updateErr) {
              console.log(`Failed to fetch update ${i}:`, updateErr);
            }
          }
          
          // Sort updates by timestamp (newest first)
          campaignUpdates.sort((a, b) => b.timestamp - a.timestamp);
          setUpdates(campaignUpdates);
        } catch (updateErr) {
          console.log('Failed to fetch updates:', updateErr);
          setUpdates([]); // Set empty array if no updates or error
        }
      } catch (err) {
        console.error('Failed to fetch campaign data:', err);
        setError('Failed to load campaign data. Please check the campaign address.');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaignData();
  }, [params?.id]);

  const handleDonate = async () => {
    if (!wallet) {
      toast({
        title: 'Wallet Required',
        description: 'Please connect your wallet to donate',
        variant: 'destructive',
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid donation amount',
        variant: 'destructive',
      });
      return;
    }

    setIsDonating(true);
    try {
      const campaignContract = new ethers.Contract(
        params?.id || '', 
        ["function donateETH() payable"], 
        wallet.signer
      );

      // Convert amount to wei for ETH donation
      const amountInWei = ethers.parseEther(amount);
      
      // Send donation transaction
      const tx = await campaignContract.donateETH({ value: amountInWei });
      await tx.wait();
      
      // Record donation in progress tracker
      await ProgressTracker.recordDonation(
        params?.id || '',
        amount,
        'ETH',
        tx.hash
      );
      
      toast({
        title: 'Donation Successful',
        description: `Successfully donated ${amount} ${selectedToken}! Transaction confirmed.`,
      });
      
      setAmount('');
      
      // Refresh campaign data to show updated balance
      window.location.reload();
      
    } catch (error) {
      console.error('Donation failed:', error);
      toast({
        title: 'Donation Failed',
        description: 'Failed to process donation: ' + (error instanceof Error ? error.message : String(error)),
        variant: 'destructive',
      });
    } finally {
      setIsDonating(false);
    }
  };

  const handlePostUpdate = async () => {
    if (!wallet) {
      toast({
        title: 'Wallet Required',
        description: 'Please connect your wallet to post updates',
        variant: 'destructive',
      });
      return;
    }

    if (!newUpdate.trim()) {
      toast({
        title: 'Update Required',
        description: 'Please enter an update message',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsPostingUpdate(true);
      
      const campaignContract = new ethers.Contract(
        params?.id || '', 
        [
          "function postUpdate(string memory newUpdate)",
          "function getUpdateCount() view returns (uint256)",
          "function getUpdate(uint256) view returns (string, uint256)"
        ], 
        wallet.signer
      );

      const tx = await campaignContract.postUpdate(newUpdate);
      await tx.wait();

      toast({
        title: 'Update Posted',
        description: 'Your campaign update has been posted successfully',
      });

      setNewUpdate('');
      
      // Wait 1 second then refresh the page to show the new update
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (err) {
      console.error('Failed to post update:', err);
      toast({
        title: 'Error',
        description: 'Failed to post update: ' + (err instanceof Error ? err.message : String(err)),
        variant: 'destructive',
      });
    } finally {
      setIsPostingUpdate(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Address copied to clipboard',
    });
  };

  const shareUrl = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Link Copied',
      description: 'Campaign link copied to clipboard',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <PageContainer>
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-freeflow-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading campaign details...</p>
          </div>
        </PageContainer>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <PageContainer>
          <div className="text-center py-12">
            <p className="text-red-500 mb-4">{error}</p>
            <Link href="/campaigns">
              <Button variant="outline">Back to Campaigns</Button>
            </Link>
          </div>
        </PageContainer>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <PageContainer>
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Campaign not found</p>
            <Link href="/campaigns">
              <Button variant="outline">Back to Campaigns</Button>
            </Link>
          </div>
        </PageContainer>
      </div>
    );
  }

  const getStatusBadge = () => {
    switch (campaign.status) {
      case 'goal_met':
        return <Badge className="bg-green-100 text-green-800">🎯 Goal Met</Badge>;
      case 'ended':
        return <Badge className="bg-gray-100 text-gray-800">Ended</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800">Active</Badge>;
    }
  };

  const quickAmounts = ['0.1', '0.25', '0.5', '1'];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <PageContainer>
        <div className="mb-6">
          <Link href="/campaigns">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Campaigns
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Campaign Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  {getStatusBadge()}
                  <Button variant="outline" onClick={shareUrl}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>
                
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {campaign.title}
                </h1>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600 mb-6">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {campaign.timeLeft}
                  </div>
                  <div className="flex items-center">
                    <Target className="w-4 h-4 mr-1" />
                    Goal: {campaign.goal} ETH
                  </div>
                </div>

                {campaign.imageUrl && (
                  <img
                    src={campaign.imageUrl}
                    alt={campaign.title}
                    className="w-full h-64 object-cover rounded-lg mb-6"
                  />
                )}

                <div className="prose max-w-none">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">About This Campaign</h3>
                  <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">
                    {campaign.description}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Campaign Updates */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {updates.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No updates yet.</p>
                  ) : (
                    updates.map((update, index) => (
                      <div key={index} className="border-l-4 border-freeflow-600 pl-4">
                        <p className="text-sm text-gray-500 font-medium">
                          {new Date(update.timestamp * 1000).toLocaleString()}
                        </p>
                        <p className="text-gray-700 mt-1">
                          {update.message}
                        </p>
                      </div>
                    ))
                  )}
                  
                  {/* Post Update Interface - Only show for campaign owners when active */}
                  {wallet && campaign && wallet.address.toLowerCase() === campaign.creator.toLowerCase() && campaign.status === 'active' && (
                    <div className="border-t pt-4 mt-4">
                      <h5 className="font-medium text-gray-900 mb-3">Post Campaign Update</h5>
                      <div className="space-y-3">
                        <Textarea
                          value={newUpdate}
                          onChange={(e) => setNewUpdate(e.target.value)}
                          placeholder="Write an update for your supporters..."
                          className="min-h-[100px] resize-none"
                        />
                        <Button
                          onClick={handlePostUpdate}
                          disabled={isPostingUpdate || !newUpdate.trim()}
                          className="w-full bg-freeflow-900 hover:bg-freeflow-800 text-white"
                        >
                          {isPostingUpdate ? 'Posting...' : 'Post Update'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Campaign Details */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Creator:</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono">{formatAddress(campaign.creator)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(campaign.creator)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  {campaign.contractAddress && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Contract:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono">{formatAddress(campaign.contractAddress)}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(campaign.contractAddress!)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Network:</span>
                    <span>Base</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Progress Card */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="text-gray-900 font-medium">{campaign.progress}%</span>
                  </div>
                  <Progress value={campaign.progress} className="h-3" />
                  <div className="flex justify-between text-lg font-semibold">
                    <span className="text-gray-900">{campaign.raised} ETH</span>
                    <span className="text-gray-600">of {campaign.goal} ETH</span>
                  </div>
                  <div className="text-center text-sm text-gray-600">
                    ~${(parseFloat(campaign.raised) * 1880).toLocaleString()} USD raised
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Balance Display for Campaign Owners */}
            {campaign.contractAddress && (
              <BalanceDisplay
                campaignAddress={campaign.contractAddress}
                campaignOwner={campaign.creator}
              />
            )}

            {/* Donation Interface */}
            <Card>
              <CardHeader>
                <CardTitle>Make a Donation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Token Selection */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Select Token</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {campaign.acceptedTokens.map((token) => (
                      <Button
                        key={token}
                        variant={selectedToken === token ? 'default' : 'outline'}
                        className={selectedToken === token ? 'bg-freeflow-900 text-white' : ''}
                        onClick={() => setSelectedToken(token)}
                      >
                        {token}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="focus:ring-freeflow-500 focus:border-freeflow-500"
                  />
                </div>

                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {quickAmounts.map((quickAmount) => (
                    <Button
                      key={quickAmount}
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(quickAmount)}
                      className="text-gray-700 hover:bg-gray-200"
                    >
                      {quickAmount} {selectedToken}
                    </Button>
                  ))}
                </div>

                {/* Donate Button */}
                <Button
                  className="w-full bg-freeflow-900 hover:bg-freeflow-800 text-white"
                  onClick={handleDonate}
                  disabled={isDonating || !wallet}
                >
                  {isDonating ? (
                    'Processing...'
                  ) : (
                    <>
                      <Heart className="w-4 h-4 mr-2" />
                      Donate Now
                    </>
                  )}
                </Button>

                {!wallet && (
                  <p className="text-sm text-gray-500 text-center">
                    Connect your wallet to donate
                  </p>
                )}

                {/* Fee Notice */}
                <p className="text-xs text-gray-500 text-center">
                  Platform fee: 2% • Funds go directly to campaign smart contract
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}

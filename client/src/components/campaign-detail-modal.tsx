import { useState, useEffect } from 'react';
import { Heart, Clock, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Campaign } from '@/types/campaign';
import { useWallet } from '@/hooks/use-wallet';
import { useToast } from '@/hooks/use-toast';
import { ethers } from 'ethers';
import { ENV } from '@/lib/env';
import { ProgressTracker } from '@/lib/progress-tracker';

interface CampaignDetailModalProps {
  campaign: Campaign | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CampaignDetailModal({ campaign, isOpen, onClose }: CampaignDetailModalProps) {
  const [selectedToken, setSelectedToken] = useState('ETH');
  const [amount, setAmount] = useState('');
  const [isDonating, setIsDonating] = useState(false);
  const [updates, setUpdates] = useState<Array<{ message: string; timestamp: number }>>([]);
  const [isLoadingUpdates, setIsLoadingUpdates] = useState(false);
  const [lockedBalance, setLockedBalance] = useState<string | null>(null);
  const [lockedProgress, setLockedProgress] = useState<number | null>(null);
  const { wallet } = useWallet();
  const { toast } = useToast();

  // Fetch campaign updates and check for locked balance when modal opens
  useEffect(() => {
    if (isOpen && campaign) {
      fetchCampaignUpdates();
      checkForLockedBalance();
    }
  }, [isOpen, campaign]);

  if (!campaign) return null;

  const checkForLockedBalance = async () => {
    if (!campaign.contractAddress) return;
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const campaignContract = new ethers.Contract(
        campaign.contractAddress,
        [
          "function deadline() view returns (uint256)",
          "function goal() view returns (uint256)",
          "function getTotalBalance() view returns (uint256,uint256)",
          "function getWithdrawableAmount() view returns (uint256,uint256)",
          "function getFeeBalances() view returns (uint256,uint256)"
        ],
        provider
      );
      
      const erc20Abi = [
        "function balanceOf(address) view returns (uint256)"
      ];
      
      const deadline = await campaignContract.deadline();
      const goal = await campaignContract.goal();
      const goalInEth = ethers.formatEther(goal);
      const deadlineNum = Number(deadline);
      const isActive = deadlineNum * 1000 > Date.now();
      
      // Get blockchain data for sync using getTotalBalance() method
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
          const usdcBalance = await usdcContract.balanceOf(campaign.contractAddress);
          const usdcAmount = ethers.formatUnits(usdcBalance, 6); // USDC has 6 decimals
          
          if (parseFloat(usdcAmount) > 0) {
            const usdcUSDValue = await ProgressTracker.convertToUSD(usdcAmount, 'USDC');
            totalUSDValue += parseFloat(usdcUSDValue);
          }
        } catch (error) {
          console.log(`Failed to fetch USDC balance for ${campaign.contractAddress}:`, error);
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
        console.log(`Modal: Campaign ${campaign.contractAddress} blockchain balance: ${blockchainRaised} ETH${flwEnabled ? ` (Total USD: $${totalUSDValue.toFixed(2)})` : ''}`);
      } catch (error) {
        console.warn('Could not get total balance, trying fallback method:', error);
        // Fallback to original method if getTotalBalance fails
        if (isActive) {
          const [ethAvailable] = await campaignContract.getWithdrawableAmount();
          blockchainRaised = ethers.formatEther(ethAvailable);
        } else {
          try {
            const [ethAvailable] = await campaignContract.getWithdrawableAmount();
            const [currentFees] = await campaignContract.getFeeBalances();
            const totalFinalBalance = ethAvailable + currentFees;
            blockchainRaised = ethers.formatEther(totalFinalBalance);
          } catch (error) {
            console.log('Could not get fees for ended campaign, using withdrawable amount');
            const [ethAvailable] = await campaignContract.getWithdrawableAmount();
            blockchainRaised = ethers.formatEther(ethAvailable);
          }
        }
      }
      
      // Sync with progress tracker
      await ProgressTracker.syncWithBlockchain(campaign.contractAddress, goalInEth, blockchainRaised, isActive);
      
      // Get progress from tracker (this will be locked for ended campaigns)
      const raisedInEth = await ProgressTracker.getTotalRaisedETH(campaign.contractAddress);
      const progress = ProgressTracker.getProgressPercentage(campaign.contractAddress);
      
      setLockedBalance(raisedInEth);
      setLockedProgress(progress);
      
    } catch (error) {
      console.error('Error checking for locked balance:', error);
    }
  };

  const fetchCampaignUpdates = async () => {
    setIsLoadingUpdates(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const campaignContract = new ethers.Contract(
        campaign.contractAddress || campaign.id,
        [
          "function getUpdateCount() view returns (uint256)",
          "function getUpdate(uint256) view returns (string, uint256)"
        ],
        provider
      );

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
      
      campaignUpdates.sort((a, b) => b.timestamp - a.timestamp);
      setUpdates(campaignUpdates);
      
    } catch (error) {
      console.error('Failed to fetch campaign updates:', error);
      setUpdates([]);
    } finally {
      setIsLoadingUpdates(false);
    }
  };

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
      if (selectedToken === 'ETH') {
        // ETH donation - single transaction
        const campaignContract = new ethers.Contract(
          campaign.contractAddress || campaign.id, 
          ["function donateETH() payable"], 
          wallet.signer
        );

        const amountInWei = ethers.parseEther(amount);
        const tx = await campaignContract.donateETH({ value: amountInWei });
        await tx.wait();
        
        // Record donation in progress tracker
        await ProgressTracker.recordDonation(
          campaign.contractAddress || campaign.id,
          amount,
          'ETH',
          tx.hash
        );
        
        toast({
          title: 'Donation Successful',
          description: `Successfully donated ${amount} ETH! Transaction confirmed.`,
        });
        
      } else if (selectedToken === 'USDC') {
        // USDC donation - two-step process (approve + donate)
        const { getCampaignContract } = await import('@/lib/contracts');
        const { getAddress } = await import('@/lib/contract-config');
        const campaignContract = getCampaignContract(campaign.contractAddress || campaign.id, wallet);
        const usdcAddress = getAddress('USDC');
        
        // Step 1: Check allowance
        const currentAllowance = await campaignContract.getTokenAllowance(
          usdcAddress,
          wallet.address,
          6 // USDC has 6 decimals
        );
        
        if (parseFloat(currentAllowance) < parseFloat(amount)) {
          toast({
            title: 'Approving USDC...',
            description: 'Please approve the campaign contract to spend your USDC tokens.',
          });
          
          // Step 2: Approve tokens
          const approveTx = await campaignContract.approveToken(usdcAddress, amount, 6);
          await wallet.provider.waitForTransaction(approveTx);
          
          toast({
            title: 'Approval Successful',
            description: 'USDC spending approved. Now processing donation...',
          });
        }
        
        // Step 3: Donate tokens
        const donateTx = await campaignContract.donateToken(usdcAddress, amount, 6);
        await wallet.provider.waitForTransaction(donateTx);
        
        // Record donation in progress tracker
        await ProgressTracker.recordDonation(
          campaign.contractAddress || campaign.id,
          amount,
          'USDC',
          donateTx
        );
        
        toast({
          title: 'Donation Successful',
          description: `Successfully donated ${amount} USDC! Transaction confirmed.`,
        });
        
      } else if (selectedToken === 'FLW') {
        // FLW donation - two-step process (approve + donate)
        const { getCampaignContract } = await import('@/lib/contracts');
        const { getAddress } = await import('@/lib/contract-config');
        const campaignContract = getCampaignContract(campaign.contractAddress || campaign.id, wallet);
        const flwAddress = getAddress('FLW');
        
        // Step 1: Check allowance
        const currentAllowance = await campaignContract.getTokenAllowance(
          flwAddress,
          wallet.address,
          18 // FLW has 18 decimals
        );
        
        if (parseFloat(currentAllowance) < parseFloat(amount)) {
          toast({
            title: 'Approving FLW...',
            description: 'Please approve the campaign contract to spend your FLW tokens.',
          });
          
          // Step 2: Approve tokens
          const approveTx = await campaignContract.approveToken(flwAddress, amount, 18);
          await wallet.provider.waitForTransaction(approveTx);
          
          toast({
            title: 'Approval Successful',
            description: 'FLW spending approved. Now processing donation...',
          });
        }
        
        // Step 3: Donate tokens
        const donateTx = await campaignContract.donateToken(flwAddress, amount, 18);
        await wallet.provider.waitForTransaction(donateTx);
        
        // Record donation in progress tracker
        await ProgressTracker.recordDonation(
          campaign.contractAddress || campaign.id,
          amount,
          'FLW',
          donateTx
        );
        
        toast({
          title: 'Donation Successful',
          description: `Successfully donated ${amount} FLW! Transaction confirmed.`,
        });
      }
      
      setAmount('');
      
      // Wait 2 seconds before closing modal and refreshing
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 2000);
      
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

  const quickAmounts = ['0.1', '0.25', '0.5', '1'];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Address copied to clipboard',
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            {campaign.title}
          </DialogTitle>
          <DialogDescription>
            View campaign details, progress, and make donations
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Campaign Info */}
          <div className="space-y-6">
            {campaign.imageUrl && (
              <img
                src={campaign.imageUrl}
                alt={campaign.title}
                className="w-full h-64 object-cover rounded-lg"
              />
            )}
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Campaign Description</h4>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                {campaign.description}
              </p>
            </div>
            
            {/* Campaign Updates */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Campaign Updates</h4>
              <div className="space-y-4">
                {isLoadingUpdates ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-freeflow-600"></div>
                  </div>
                ) : updates.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No updates posted yet.</p>
                  </div>
                ) : (
                  updates.map((update, index) => (
                    <div key={index} className="border-l-4 border-freeflow-600 pl-4">
                      <p className="text-sm text-gray-500">
                        {new Date(update.timestamp * 1000).toLocaleDateString()}
                      </p>
                      <p className="text-gray-700">{update.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
          {/* Right Column - Donation Interface */}
          <div className="space-y-6">
            {/* Progress Section */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                {getStatusBadge()}
                {campaign.timeLeft && (
                  <span className="text-sm text-gray-500 flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {campaign.timeLeft}
                  </span>
                )}
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Progress</span>
                  <span className="text-gray-900 font-medium">
                    {lockedProgress !== null ? lockedProgress : campaign.progress}%
                  </span>
                </div>
                <Progress value={lockedProgress !== null ? lockedProgress : campaign.progress} className="h-3" />
                <div className="flex justify-between text-lg font-semibold">
                  <span className="text-gray-900">
                    {lockedBalance !== null ? lockedBalance : campaign.raised} ETH
                    {lockedBalance !== null && (
                      <span className="text-xs text-gray-500 ml-1">(final)</span>
                    )}
                  </span>
                  <span className="text-gray-600">Goal: {campaign.goal} ETH</span>
                </div>
                <div className="text-center text-sm text-gray-600">
                  ~${(parseFloat(lockedBalance !== null ? lockedBalance : campaign.raised) * 1880).toLocaleString()} USD raised
                  {lockedBalance !== null && (
                    <span className="text-xs text-gray-500 block">(locked at campaign end)</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Donation Interface - Only show if campaign is active */}
            {campaign.status === 'active' && (
              <div className="border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Make a Donation</h4>
                
                {/* Token Selection */}
                <div className="mb-4">
                  <Label className="text-sm font-medium text-gray-700 mb-2">Select Token</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {campaign.acceptedTokens
                      .filter(token => token !== 'FLW' || ENV.ALLOW_FLW)
                      .map((token) => (
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
                <div className="mb-4">
                  <Label htmlFor="donation-amount" className="text-sm font-medium text-gray-700 mb-2">Amount</Label>
                  <Input
                    id="donation-amount"
                    name="donation-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="focus:ring-freeflow-500 focus:border-freeflow-500"
                    aria-label={`Donation amount in ${selectedToken}`}
                  />
                </div>
                
                {/* Quick Amount Buttons */}
                <div className="grid grid-cols-4 gap-2 mb-6">
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
                
                {/* Fee Notice */}
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Platform fee: 2% • Funds go directly to campaign smart contract
                </p>
              </div>
            )}
            
            {/* Campaign Ended Message */}
            {campaign.status === 'ended' && (
              <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                <div className="text-center">
                  <h4 className="font-semibold text-gray-900 mb-2">Campaign Ended</h4>
                  <p className="text-sm text-gray-600">
                    This campaign has reached its deadline and is no longer accepting donations.
                  </p>
                </div>
              </div>
            )}
            
            {/* Goal Met Message */}
            {campaign.status === 'goal_met' && (
              <div className="border border-green-200 rounded-lg p-6 bg-green-50">
                <div className="text-center">
                  <h4 className="font-semibold text-green-900 mb-2">Goal Achieved!</h4>
                  <p className="text-sm text-green-700">
                    This campaign has successfully reached its funding goal.
                  </p>
                </div>
              </div>
            )}
            
            {/* Campaign Info */}
            <div className="text-sm text-gray-600 space-y-2">
              <div className="flex justify-between items-center">
                <span>Creator:</span>
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
                  <span>Campaign Address:</span>
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
                <span>Network:</span>
                <span>Base</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

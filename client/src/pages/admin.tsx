import { useState, useEffect } from 'react';
import { Shield, Users, Coins, TrendingUp, Settings, DollarSign, Wallet, AlertTriangle } from 'lucide-react';
import { ethers } from 'ethers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageContainer } from '@/components/page-container';
import { useWallet } from '@/hooks/use-wallet';
import { useCryptoPrices, formatUSDValue } from '@/hooks/use-crypto-prices';
import { getFeeDistributorContract, getCampaignFactoryContract } from '@/lib/contracts';
import { ENV } from '@/lib/env';

// Temporary development mode - set to false for production
const DEV_MODE = false;

export default function Admin() {
  const { wallet } = useWallet();
  const { eth, usdc } = useCryptoPrices();
  
  // Fee distribution states
  const [feeBalances, setFeeBalances] = useState({
    eth: '0',
    usdc: '0',
    flw: '0'
  });
  
  // Uncollected fees from campaigns
  const [uncollectedFees, setUncollectedFees] = useState({
    eth: '0',
    usdc: '0',
    flw: '0',
    campaignCount: 0
  });
  
  // Recipient wallet addresses
  const [recipients, setRecipients] = useState({
    validator: '',
    team: '',
    treasury: '',
    marketing: '',
    rnd: ''
  });
  
  // Token distribution
  const [selectedDistributionToken, setSelectedDistributionToken] = useState('ETH');
  
  // Platform statistics
  const [platformStats, setPlatformStats] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalRaised: 0,
    loading: true
  });
  
  // Status message
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is owner (with dev mode bypass)
  const isOwner = DEV_MODE || (wallet?.address?.toLowerCase() === ENV.OWNER_ADDRESS?.toLowerCase());

  useEffect(() => {
    if (isOwner) {
      loadFeeBalances();
      loadRecipients();
      loadUncollectedFees();
      loadPlatformStats();
    }
  }, [isOwner]);

  const loadFeeBalances = async () => {
    try {
      if (!wallet) return;
      
      setStatus('Loading fee balances...');
      const feeDistributor = getFeeDistributorContract(wallet);
      const { TOKEN_ADDRESSES } = await import('@/lib/contracts');
      
      const [ethBalance, usdcBalance, flwBalance] = await Promise.all([
        feeDistributor.getBalance(),
        feeDistributor.getTokenBalance(TOKEN_ADDRESSES.USDC).catch(() => '0'),
        feeDistributor.getTokenBalance(TOKEN_ADDRESSES.FLW).catch(() => '0')
      ]);
      
      setFeeBalances({
        eth: ethBalance,
        usdc: usdcBalance,
        flw: flwBalance
      });
      
      setStatus('Fee balances loaded successfully');
    } catch (error) {
      console.error('Failed to load fee balances:', error);
      setStatus('Failed to load fee balances');
    }
  };

  const loadRecipients = async () => {
    try {
      // In development, show mock addresses
      if (DEV_MODE) {
        setRecipients({
          validator: '0x1234...5678',
          team: '0x2345...6789',
          treasury: '0x3456...7890',
          marketing: '0x4567...8901',
          rnd: '0x5678...9012'
        });
        return;
      }
      
      if (!wallet) {
        setStatus('Please connect your wallet to load recipients');
        return;
      }
      
      setStatus('Loading recipient addresses...');
      const feeDistributor = getFeeDistributorContract(wallet);
      const recipients = await feeDistributor.getRecipients();
      
      setRecipients(recipients);
      setStatus('Recipients loaded successfully');
      
    } catch (error) {
      console.error('Failed to load recipients:', error);
      setStatus('Failed to load recipients');
    }
  };

  const loadUncollectedFees = async () => {
    try {
      if (DEV_MODE) {
        // Mock data showing uncollected fees across campaigns
        setUncollectedFees({
          eth: '1.25',
          usdc: '3420.75',
          flw: '8500',
          campaignCount: 18
        });
        return;
      }

      setStatus('Loading uncollected fees from campaigns...');
      
      if (!wallet) {
        setStatus('Please connect your wallet to load uncollected fees');
        return;
      }
      
      // Real implementation: Get all campaigns and sum their uncollected fees
      const factory = getCampaignFactoryContract(wallet);
      const campaigns = await factory.getAllCampaigns();
      
      let totalEth = ethers.getBigInt(0);
      let totalUsdc = ethers.getBigInt(0);
      let totalFlw = ethers.getBigInt(0);
      let campaignCount = 0;
      
      for (const campaignAddress of campaigns) {
        try {
          const campaign = new ethers.Contract(
            campaignAddress, 
            [
              "function getFeeBalances() view returns (uint256, uint256)",
              "function tokenFeesCollected(address) view returns (uint256)",
              "function isActive() view returns (bool)"
            ], 
            wallet.provider
          );
          
          const [ethFees, flwFees] = await campaign.getFeeBalances();
          
          if (ethFees > 0) {
            totalEth = totalEth + ethers.getBigInt(ethFees);
            campaignCount++;
          }
          
          if (flwFees > 0) {
            totalFlw = totalFlw + ethers.getBigInt(flwFees);
          }
          
          // Check USDC fees using contract address from config
          try {
            const { TOKEN_ADDRESSES } = await import('@/lib/contracts');
            const usdcFees = await campaign.tokenFeesCollected(TOKEN_ADDRESSES.USDC);
            if (usdcFees > 0) {
              totalUsdc = totalUsdc + ethers.getBigInt(usdcFees);
            }
          } catch (usdcErr) {
            // USDC fees not available for this campaign
          }
          
          // Add delay to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (err) {
          console.warn("Skipping campaign (could not read fees):", campaignAddress, err);
        }
      }
      
      setUncollectedFees({
        eth: ethers.formatEther(totalEth),
        usdc: ethers.formatUnits(totalUsdc, 6),
        flw: ethers.formatUnits(totalFlw, 18),
        campaignCount: campaignCount
      });
      
      setStatus(`Loaded uncollected fees from ${campaigns.length} campaigns`);
      
      
    } catch (error) {
      console.error('Failed to load uncollected fees:', error);
      setStatus('Failed to load uncollected fees');
    }
  };

  const handleDistributeManually = async () => {
    if (!wallet) {
      setStatus('Please connect your wallet');
      return;
    }

    setIsLoading(true);
    try {
      const feeDistributor = getFeeDistributorContract(wallet);
      const { TOKEN_ADDRESSES } = await import('@/lib/contracts');
      
      let txHash: string;
      let currentBalance: string;
      
      if (selectedDistributionToken === 'ETH') {
        setStatus('Getting ETH balance...');
        currentBalance = await feeDistributor.getBalance();
        
        if (parseFloat(currentBalance) <= 0) {
          setStatus('No ETH balance to distribute');
          setIsLoading(false);
          return;
        }

        setStatus(`Distributing ${currentBalance} ETH to recipients...`);
        txHash = await feeDistributor.distributeETHManually(currentBalance);
        
      } else if (selectedDistributionToken === 'USDC') {
        setStatus('Getting USDC balance...');
        currentBalance = await feeDistributor.getTokenBalance(TOKEN_ADDRESSES.USDC);
        
        if (parseFloat(currentBalance) <= 0) {
          setStatus('No USDC balance to distribute');
          setIsLoading(false);
          return;
        }

        setStatus(`Distributing ${currentBalance} USDC to recipients...`);
        txHash = await feeDistributor.distributeTokenManually(TOKEN_ADDRESSES.USDC, currentBalance, 6);
        
      } else if (selectedDistributionToken === 'FLW') {
        setStatus('Getting FLW balance...');
        currentBalance = await feeDistributor.getTokenBalance(TOKEN_ADDRESSES.FLW);
        
        if (parseFloat(currentBalance) <= 0) {
          setStatus('No FLW balance to distribute');
          setIsLoading(false);
          return;
        }

        setStatus(`Distributing ${currentBalance} FLW to recipients...`);
        txHash = await feeDistributor.distributeTokenManually(TOKEN_ADDRESSES.FLW, currentBalance, 18);
      }
      
      setStatus(`${selectedDistributionToken} distribution successful! TX: ${txHash!.slice(0, 10)}...`);
      
      // Refresh balances after distribution
      setTimeout(() => {
        setStatus('Refreshing balances...');
        loadFeeBalances();
        loadUncollectedFees();
      }, 1500);
      
    } catch (error) {
      console.error('Distribution failed:', error);
      setStatus('Distribution failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlatformStats = async () => {
    try {
      if (!wallet) return;
      
      const factory = getCampaignFactoryContract(wallet);
      const campaignCount = await factory.getCampaignCount();
      const campaignAddresses = await factory.getAllCampaigns();
      
      // Sequential processing to avoid rate limiting
      let activeCampaigns = 0;
      let totalRaised = 0;
      
      const campaignAbi = [
        "function deadline() view returns (uint256)",
        "function getWithdrawableAmount() view returns (uint256,uint256)"
      ];
      
      for (let i = 0; i < campaignAddresses.length; i++) {
        try {
          const campaignContract = new ethers.Contract(campaignAddresses[i], campaignAbi, wallet.provider);
          const deadline = await campaignContract.deadline();
          const [ethAvailable] = await campaignContract.getWithdrawableAmount();
          
          const isActive = Number(deadline) * 1000 > Date.now();
          if (isActive) activeCampaigns++;
          
          totalRaised += parseFloat(ethers.formatEther(ethAvailable));
          
          // Small delay to avoid rate limiting
          if (i < campaignAddresses.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (err) {
          console.warn(`Failed to load campaign ${i}:`, err);
        }
      }
      
      setPlatformStats({
        totalCampaigns: campaignCount,
        activeCampaigns,
        totalRaised,
        loading: false
      });
    } catch (error) {
      console.error('Failed to load platform stats:', error);
      setPlatformStats(prev => ({ ...prev, loading: false }));
    }
  };

  const handleCollectAllFees = async () => {
    if (!wallet) {
      setStatus('Please connect your wallet');
      return;
    }

    setIsLoading(true);
    try {
      setStatus('Collecting all campaign fees...');
      
      const factory = getCampaignFactoryContract(wallet);
      const { CONTRACT_ADDRESSES } = await import('@/lib/contracts');
      
      console.log('Calling collectFeesFromAllCampaigns with FeeDistributor:', CONTRACT_ADDRESSES.FEE_DISTRIBUTOR);
      
      // First, check if there are any campaigns with fees
      const campaigns = await factory.getAllCampaigns();
      console.log('Found campaigns:', campaigns.length);
      
      let totalFeesFound = 0;
      for (const campaignAddress of campaigns) {
        try {
          const campaign = new ethers.Contract(
            campaignAddress,
            [
              "function getFeeBalances() view returns (uint256, uint256)",
              "function ethFeesCollected() view returns (uint256)"
            ],
            wallet.provider
          );
          
          const [ethFees] = await campaign.getFeeBalances();
          const ethFeesCollected = await campaign.ethFeesCollected();
          
          console.log(`Campaign ${campaignAddress}: ethFees=${ethers.formatEther(ethFees)}, ethFeesCollected=${ethers.formatEther(ethFeesCollected)}`);
          totalFeesFound += parseFloat(ethers.formatEther(ethFees));
        } catch (err) {
          console.log(`Could not check fees for campaign ${campaignAddress}:`, err);
        }
      }
      
      console.log('Total fees found across all campaigns:', totalFeesFound);
      
      if (totalFeesFound === 0) {
        setStatus('No fees found in any campaigns to collect');
        setIsLoading(false);
        return;
      }
      
      // Check if campaigns are ended (fees can only be collected after campaign ends)
      setStatus('Checking campaign states and permissions...');
      let endedCampaignsWithFees = 0;
      
      for (const campaignAddress of campaigns) {
        try {
          const campaign = new ethers.Contract(
            campaignAddress,
            [
              "function getFeeBalances() view returns (uint256, uint256)",
              "function deadline() view returns (uint256)",
              "function owner() view returns (address)"
            ],
            wallet.provider
          );
          
          const [ethFees] = await campaign.getFeeBalances();
          const deadline = await campaign.deadline();
          const campaignOwner = await campaign.owner();
          const now = Math.floor(Date.now() / 1000);
          const isEnded = now > Number(deadline);
          
          if (ethFees > 0) {
            console.log(`Campaign ${campaignAddress}:`);
            console.log(`  - ETH fees: ${ethers.formatEther(ethFees)}`);
            console.log(`  - Deadline: ${deadline} (${isEnded ? 'ENDED' : 'ACTIVE'})`);
            console.log(`  - Owner: ${campaignOwner}`);
            console.log(`  - Your address: ${wallet.address}`);
            console.log(`  - Factory address: ${factory.getAddress()}`);
            
            if (isEnded) {
              endedCampaignsWithFees++;
            }
          }
        } catch (err) {
          console.log(`Could not check campaign ${campaignAddress}:`, err);
        }
      }
      
      console.log(`Found ${endedCampaignsWithFees} ended campaigns with fees`);
      
      if (endedCampaignsWithFees === 0) {
        setStatus('No ended campaigns with fees found. Fees can only be collected after campaign ends.');
        setIsLoading(false);
        return;
      }
      
      // Check factory contract permissions
      try {
        const factoryOwner = await factory.getOwner();
        console.log(`Factory owner: ${factoryOwner}`);
        console.log(`Your address: ${wallet.address}`);
        console.log(`Is factory owner: ${factoryOwner.toLowerCase() === wallet.address.toLowerCase()}`);
      } catch (err) {
        console.log('Could not check factory owner:', err);
      }
      
      setStatus('Attempting factory fee collection...');
      
      // Call factory method
      try {
        const txHash = await factory.collectFeesFromAllCampaigns(CONTRACT_ADDRESSES.FEE_DISTRIBUTOR);
        console.log('Factory fee collection transaction sent:', txHash);
        setStatus(`Fee collection transaction sent! TX: ${txHash.slice(0, 10)}... (waiting for confirmation)`);
      } catch (factoryError) {
        console.error('Factory fee collection failed:', factoryError);
        setStatus('Factory fee collection failed: ' + (factoryError instanceof Error ? factoryError.message : String(factoryError)));
      }
      
      // Wait a bit longer for transaction to complete
      setTimeout(() => {
        setStatus('Refreshing balances...');
        loadFeeBalances();
        loadUncollectedFees();
      }, 3000);
      
    } catch (error) {
      console.error('Failed to collect fees:', error);
      setStatus('Failed to collect campaign fees: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRecipients = async () => {
    if (!wallet) {
      setStatus('Please connect your wallet');
      return;
    }

    setIsLoading(true);
    try {
      if (DEV_MODE) {
        setStatus('Would update recipient wallet addresses');
        setIsLoading(false);
        return;
      }

      setStatus('Updating recipient addresses...');
      
      const feeDistributor = getFeeDistributorContract(wallet);
      
      // Validate addresses
      const addresses = [recipients.validator, recipients.team, recipients.treasury, recipients.marketing, recipients.rnd];
      for (const address of addresses) {
        if (!ethers.isAddress(address)) {
          throw new Error(`Invalid address: ${address}`);
        }
      }
      
      // Update recipients on the contract
      const tx = await feeDistributor.updateRecipients(
        recipients.validator,
        recipients.team,
        recipients.treasury,
        recipients.marketing,
        recipients.rnd
      );
      
      setStatus('Transaction sent, waiting for confirmation...');
      const receipt = await tx.wait();
      
      setStatus(`Recipients updated successfully! TX: ${tx.hash.slice(0, 10)}...`);
      
      // Refresh recipient data
      setTimeout(() => {
        loadRecipients();
      }, 1500);
      
    } catch (error) {
      console.error('Failed to update recipients:', error);
      setStatus('Failed to update recipients: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <PageContainer>
          <div className="max-w-md mx-auto">
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center text-red-700">
                  <Shield className="w-5 h-5 mr-2" />
                  Access Denied
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-600">
                  This admin panel is restricted to the platform owner.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Current wallet: {wallet?.address || 'Not connected'}
                </p>
                <p className="text-sm text-gray-500">
                  Required: {ENV.OWNER_ADDRESS}
                </p>
              </CardContent>
            </Card>
          </div>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <PageContainer>
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">FreeFlow Admin Panel</h1>
            <div className="flex items-center space-x-4">
              <Badge className="bg-green-100 text-green-800">Owner Access</Badge>
              {DEV_MODE && (
                <Badge className="bg-yellow-100 text-yellow-800">Development Mode</Badge>
              )}
            </div>
          </div>

          {status && (
            <Alert className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{status}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="fees">Fee Management</TabsTrigger>
              <TabsTrigger value="recipients">Recipients</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Quick Actions */}
              <Card className="bg-blue-50 border-blue-200 mb-6">
                <CardHeader>
                  <CardTitle className="text-blue-800">Development Tools</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-blue-600 mb-4">
                    Test the complete contract flow from campaign creation to fee collection.
                  </p>
                  <Button 
                    onClick={() => window.open('/test-flow', '_blank')}
                    variant="outline"
                    className="border-blue-300 text-blue-700 hover:bg-blue-100"
                  >
                    Open Contract Flow Test
                  </Button>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Wallet className="w-5 h-5 mr-2 text-orange-600" />
                      Ready for Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">ETH:</span>
                        <span className="font-semibold text-lg">{feeBalances.eth} ETH</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">USDC:</span>
                        <span className="font-semibold">{feeBalances.usdc} USDC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">FLW:</span>
                        <span className="font-semibold">{feeBalances.flw} FLW</span>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between font-bold">
                          <span>USD Value:</span>
                          <span>{formatUSDValue(
                            parseFloat(feeBalances.eth) * eth + 
                            parseFloat(feeBalances.usdc) * usdc
                          )}</span>
                        </div>
                      </div>
                      {parseFloat(feeBalances.eth) > 0 && (
                        <div className="mt-3 p-2 bg-orange-100 rounded text-sm text-orange-800">
                          💡 These fees are collected and ready to distribute to recipients
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                      Platform Stats
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Campaigns:</span>
                        <span className="font-semibold">
                          {platformStats.loading ? 'Loading...' : platformStats.totalCampaigns}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Active Campaigns:</span>
                        <span className="font-semibold">
                          {platformStats.loading ? 'Loading...' : platformStats.activeCampaigns}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Raised:</span>
                        <span className="font-semibold">
                          {platformStats.loading ? 'Loading...' : `${platformStats.totalRaised.toFixed(3)} ETH`}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg">
                      <Users className="w-5 h-5 mr-2 text-purple-600" />
                      Validator Network
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-2">
                        <Users className="w-12 h-12 mx-auto mb-3" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-600 mb-2">Coming Soon</h3>
                      <p className="text-gray-500 text-sm">
                        Validator staking and network governance features will be available in a future update
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Fee Management Tab */}
            <TabsContent value="fees" className="space-y-6">
              {/* Uncollected Fees Preview */}
              <Card className="bg-yellow-50 border-yellow-200">
                <CardHeader>
                  <CardTitle className="flex items-center text-yellow-800">
                    <Coins className="w-5 h-5 mr-2" />
                    Uncollected Fees Preview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">ETH Available:</span>
                        <span className="font-semibold">{uncollectedFees.eth} ETH</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">USDC Available:</span>
                        <span className="font-semibold">{uncollectedFees.usdc} USDC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">FLW Available:</span>
                        <span className="font-semibold">{uncollectedFees.flw} FLW</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Campaigns with Fees:</span>
                        <span className="font-semibold">{uncollectedFees.campaignCount}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span>Total USD Value:</span>
                        <span>{formatUSDValue(
                          parseFloat(uncollectedFees.eth) * eth + 
                          parseFloat(uncollectedFees.usdc) * usdc
                        )}</span>
                      </div>
                      <Button 
                        onClick={loadUncollectedFees}
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                      >
                        Refresh Preview
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Collect Campaign Fees</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-600">
                      Collect all uncollected fees from active campaigns to the FeeDistributor contract. 
                      Check preview above to see if collection is worth the gas cost.
                    </p>
                    <Button 
                      onClick={handleCollectAllFees}
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? 'Collecting...' : 'Collect All Campaign Fees'}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Distribute Available Fees</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="distribution-token">Select Token to Distribute</Label>
                      <select
                        id="distribution-token"
                        value={selectedDistributionToken}
                        onChange={(e) => setSelectedDistributionToken(e.target.value)}
                        className="w-full mt-1 p-2 border rounded-md"
                      >
                        <option value="ETH">ETH</option>
                        <option value="USDC">USDC</option>
                        <option value="FLW">FLW</option>
                      </select>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded text-sm">
                      <p className="font-medium mb-2">Distribution Percentages:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <span>Validators: 40%</span>
                        <span>Team: 25%</span>
                        <span>Treasury: 20%</span>
                        <span>Marketing: 10%</span>
                        <span>R&D: 5%</span>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-3 rounded space-y-1">
                      <p className="text-sm text-blue-700">
                        <strong>Available ETH:</strong> {feeBalances.eth} ETH
                      </p>
                      <p className="text-sm text-blue-700">
                        <strong>Available USDC:</strong> {feeBalances.usdc} USDC
                      </p>
                      <p className="text-sm text-blue-700">
                        <strong>Available FLW:</strong> {feeBalances.flw} FLW
                      </p>
                    </div>
                    
                    <Button 
                      onClick={handleDistributeManually}
                      disabled={isLoading || parseFloat(
                        selectedDistributionToken === 'ETH' ? feeBalances.eth :
                        selectedDistributionToken === 'USDC' ? feeBalances.usdc :
                        feeBalances.flw
                      ) <= 0}
                      className="w-full"
                    >
                      {isLoading ? 'Distributing...' : 
                        `Distribute ${
                          selectedDistributionToken === 'ETH' ? feeBalances.eth :
                          selectedDistributionToken === 'USDC' ? feeBalances.usdc :
                          feeBalances.flw
                        } ${selectedDistributionToken}`}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Recipients Tab */}
            <TabsContent value="recipients" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Update Recipient Addresses</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="validator">Validator Wallet</Label>
                      <Input
                        id="validator"
                        value={recipients.validator}
                        onChange={(e) => setRecipients({...recipients, validator: e.target.value})}
                        placeholder="0x..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="team">Team Wallet</Label>
                      <Input
                        id="team"
                        value={recipients.team}
                        onChange={(e) => setRecipients({...recipients, team: e.target.value})}
                        placeholder="0x..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="treasury">Treasury Wallet</Label>
                      <Input
                        id="treasury"
                        value={recipients.treasury}
                        onChange={(e) => setRecipients({...recipients, treasury: e.target.value})}
                        placeholder="0x..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="marketing">Marketing Wallet</Label>
                      <Input
                        id="marketing"
                        value={recipients.marketing}
                        onChange={(e) => setRecipients({...recipients, marketing: e.target.value})}
                        placeholder="0x..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="rnd">R&D Wallet</Label>
                      <Input
                        id="rnd"
                        value={recipients.rnd}
                        onChange={(e) => setRecipients({...recipients, rnd: e.target.value})}
                        placeholder="0x..."
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleUpdateRecipients}
                    disabled={isLoading}
                    className="w-full"
                  >
                    {isLoading ? 'Updating...' : 'Update Recipients'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Platform Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Platform settings are controlled by smart contract parameters. 
                        Major changes require careful consideration and testing.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">ETH Fee Rate:</span>
                        <Badge variant="outline">2%</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">USDC Fee Rate:</span>
                        <Badge variant="outline">2%</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">FLW Fee Rate:</span>
                        <Badge variant="outline">0.5%</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </PageContainer>
    </div>
  );
}
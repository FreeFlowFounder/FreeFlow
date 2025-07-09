import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageContainer } from '@/components/page-container';
import { useWallet } from '@/hooks/use-wallet';
import { useToast } from '@/hooks/use-toast';
import { getCampaignFactoryContract, getCampaignContract } from '@/lib/contracts';
import { getAddress } from '@/lib/contract-config';
import { useCryptoPrices, formatUSDValue } from '@/hooks/use-crypto-prices';
import { ENV } from '@/lib/env';
import { Play, Clock, Coins, Download, RefreshCw } from 'lucide-react';

interface TestState {
  step: number;
  campaignAddress: string;
  campaignId: string;
  balances: {
    total: string;
    withdrawable: string;
    fees: string;
  };
  donations: Array<{
    amount: string;
    donor: string;
    timestamp: Date;
  }>;
  isActive: boolean;
  timeLeft: number;
  testMode: boolean;
}

export default function TestFlow() {
  const { wallet } = useWallet();
  const { toast } = useToast();
  const { eth } = useCryptoPrices();
  
  const [loading, setLoading] = useState(false);
  const [contractInput, setContractInput] = useState('');
  const [testState, setTestState] = useState<TestState>({
    step: 0,
    campaignAddress: '',
    campaignId: '',
    balances: { total: '0', withdrawable: '0', fees: '0' },
    donations: [],
    isActive: false,
    timeLeft: 0,
    testMode: false
  });

  // Test campaign parameters
  const [testParams, setTestParams] = useState({
    title: 'Test Campaign - Free Speech Defense',
    description: 'Testing full contract flow from creation to withdrawal',
    goal: '1.0', // 1 ETH goal
    duration: '120', // 2 minutes in test mode (120 seconds)
    donationAmount: '0.01', // 0.01 ETH donation
    gasLimit: '200000',
    gasPrice: '20' // in gwei
  });

  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  // Check test mode when wallet is connected
  useEffect(() => {
    const checkTestMode = async () => {
      if (!wallet) return;
      
      try {
        const factory = getCampaignFactoryContract(wallet);
        const testMode = await factory.getTestMode();
        
        setTestState(prev => ({
          ...prev,
          testMode
        }));
      } catch (error) {
        console.error('Failed to check test mode:', error);
      }
    };

    checkTestMode();
  }, [wallet]);

  const stepTitles = [
    'Ready to Test',
    'Campaign Created',
    'Donation Made',
    'Campaign Ended',
    'Funds Withdrawn',
    'Fees Collected'
  ];

  const loadExistingContract = async () => {
    if (!wallet || !contractInput.trim()) {
      toast({ title: 'Error', description: 'Please enter a contract address', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);
      const campaign = getCampaignContract(contractInput.trim(), wallet);
      
      // Get campaign details
      const [title, description, goal, deadline, owner, isActive, totalBalance, withdrawableBalance, feeBalance] = await Promise.all([
        campaign.getTitle(),
        campaign.getDescription(),
        campaign.getGoal(),
        campaign.getDeadline(),
        campaign.getOwner(),
        campaign.isActive(),
        campaign.getTotalBalance(),
        campaign.getWithdrawableBalance(),
        campaign.getFeeBalances()
      ]);

      const now = Math.floor(Date.now() / 1000);
      const timeLeft = Math.max(0, deadline - now);

      // Also get test mode from factory
      const factory = getCampaignFactoryContract(wallet);
      const testMode = await factory.getTestMode();

      setTestState({
        step: timeLeft > 0 ? 2 : 3, // Set to step 2 if active, 3 if ended
        campaignAddress: contractInput.trim(),
        campaignId: contractInput.trim(),
        balances: {
          total: totalBalance.eth,
          withdrawable: withdrawableBalance.eth,
          fees: feeBalance.eth
        },
        donations: [],
        isActive: timeLeft > 0,
        timeLeft,
        testMode
      });

      // Update test params with loaded data
      setTestParams(prev => ({
        ...prev,
        title,
        description,
        goal: goal.toString()
      }));

      toast({ title: 'Contract Loaded!', description: `Campaign: ${title}` });
      
    } catch (error) {
      console.error('Failed to load contract:', error);
      toast({ title: 'Error', description: 'Failed to load contract. Check address and try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const startCountdown = () => {
    if (intervalId) clearInterval(intervalId);
    
    const id = setInterval(() => {
      setTestState(prev => {
        if (prev.timeLeft <= 0) {
          clearInterval(id);
          return { ...prev, timeLeft: 0, isActive: false, step: Math.max(prev.step, 3) };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
    
    setIntervalId(id);
  };

  const stopCountdown = () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const step1_CreateCampaign = async () => {
    if (!wallet) {
      toast({ title: 'Connect Wallet', description: 'Please connect your wallet first' });
      return;
    }

    try {
      setLoading(true);
      const factory = getCampaignFactoryContract(wallet);
      
      toast({ title: 'Creating Campaign...', description: 'Transaction submitted' });
      
      const txHash = await factory.createCampaign(
        testParams.goal,
        parseInt(testParams.duration), // Duration in seconds for test mode
        testParams.title,
        testParams.description,
        '' // No image for test
      );

      toast({ title: 'Campaign Created!', description: `TX: ${txHash.slice(0, 10)}...` });

      // Get the campaign address (in real implementation, you'd listen for events)
      const campaignCount = await factory.getCampaignCount();
      const campaigns = await factory.getAllCampaigns();
      const newCampaignAddress = campaigns[campaignCount - 1];

      setTestState(prev => ({
        ...prev,
        step: 1,
        campaignAddress: newCampaignAddress,
        campaignId: (campaignCount - 1).toString(),
        isActive: true,
        timeLeft: parseInt(testParams.duration)
      }));

      startCountdown();
      
    } catch (error) {
      console.error('Failed to create campaign:', error);
      toast({ title: 'Error', description: 'Failed to create campaign', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const step2_MakeDonation = async () => {
    if (!wallet || !testState.campaignAddress) return;

    try {
      setLoading(true);
      const campaign = getCampaignContract(testState.campaignAddress, wallet);
      
      toast({ title: 'Making Donation...', description: 'Contract will validate if campaign is active' });
      
      const txHash = await campaign.donateETH(testParams.donationAmount);
      
      toast({ title: 'Donation Made!', description: `TX: ${txHash.slice(0, 10)}...` });

      // Wait a moment for blockchain to update, then refresh balances
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update balances with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          const [total, withdrawable, fees] = await Promise.all([
            campaign.getTotalBalance(),
            campaign.getWithdrawableBalance(),
            campaign.getFeeBalances()
          ]);

          console.log('Balance refresh:', { total: total.eth, withdrawable: withdrawable.eth, fees: fees.eth });

          setTestState(prev => ({
            ...prev,
            step: 2,
            balances: {
              total: total.eth,
              withdrawable: withdrawable.eth,
              fees: fees.eth
            },
            donations: [
              ...prev.donations,
              {
                amount: testParams.donationAmount,
                donor: wallet.address,
                timestamp: new Date()
              }
            ]
          }));
          
          break; // Success, exit retry loop
        } catch (balanceError) {
          console.error(`Balance refresh attempt ${retryCount + 1} failed:`, balanceError);
          retryCount++;
          
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            // If all retries fail, still update with donation but show error
            toast({ title: 'Balance Update Failed', description: 'Donation successful but balance display may be outdated', variant: 'destructive' });
            
            setTestState(prev => ({
              ...prev,
              step: 2,
              donations: [
                ...prev.donations,
                {
                  amount: testParams.donationAmount,
                  donor: wallet.address,
                  timestamp: new Date()
                }
              ]
            }));
          }
        }
      }

    } catch (error) {
      console.error('Failed to make donation:', error);
      
      // More detailed error handling
      let errorMessage = 'Failed to make donation';
      if (error instanceof Error) {
        if (error.message.includes('Campaign ended') || error.message.includes('Campaign has ended')) {
          errorMessage = 'Campaign has ended. Cannot make donations after deadline.';
        } else if (error.message.includes('execution reverted')) {
          errorMessage = 'Transaction reverted. Campaign may have ended or contract issue.';
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient ETH balance for donation + gas fees';
        } else {
          errorMessage = error.message;
        }
      }
      
      // DO NOT add donation to state when transaction fails
      toast({ title: 'Donation Failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const step3_WaitForEnd = () => {
    // Campaign automatically ends when countdown reaches 0
    toast({ title: 'Campaign Ended!', description: 'You can now withdraw funds' });
  };

  const step4_WithdrawFunds = async () => {
    if (!wallet || !testState.campaignAddress) return;

    try {
      setLoading(true);
      const campaign = getCampaignContract(testState.campaignAddress, wallet);
      
      // Debug campaign state before withdrawal
      const deadline = await campaign.getDeadline();
      const now = Math.floor(Date.now() / 1000);
      const timeLeft = deadline - now;
      
      console.log('Withdrawal attempt - Campaign status:', {
        deadline,
        now,
        timeLeft,
        canWithdraw: timeLeft <= 0,
        deadlineDate: new Date(deadline * 1000).toLocaleString(),
        nowDate: new Date(now * 1000).toLocaleString()
      });
      
      toast({ title: 'Withdrawing Funds...', description: 'Transaction submitted' });
      
      const txHash = await campaign.withdraw();
      
      toast({ title: 'Funds Withdrawn!', description: `TX: ${txHash.slice(0, 10)}...` });

      // Update balances after withdrawal
      const [total, withdrawable, fees] = await Promise.all([
        campaign.getTotalBalance(),
        campaign.getWithdrawableBalance(),
        campaign.getFeeBalances()
      ]);

      setTestState(prev => ({
        ...prev,
        step: 4,
        balances: {
          total: total.eth,
          withdrawable: withdrawable.eth,
          fees: fees.eth
        }
      }));

    } catch (error) {
      console.error('Failed to withdraw funds:', error);
      
      // Extract the specific error message
      let errorMessage = 'Failed to withdraw funds';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({ title: 'Withdrawal Failed', description: errorMessage, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const step5_CollectFees = async () => {
    if (!wallet || !testState.campaignAddress) return;

    const isOwner = wallet.address.toLowerCase() === ENV.OWNER_ADDRESS?.toLowerCase();

    if (!isOwner) {
      toast({ 
        title: 'Access Denied', 
        description: `Only platform owner (${OWNER_ADDRESS.slice(0, 6)}...${OWNER_ADDRESS.slice(-4)}) can collect fees`, 
        variant: 'destructive' 
      });
      return;
    }

    try {
      setLoading(true);
      const factory = getCampaignFactoryContract(wallet);
      const feeDistributorAddress = getAddress('FeeDistributor');
      
      toast({ title: 'Collecting Fees...', description: 'Moving fees from all campaigns to fee distributor' });
      
      // Use the correct fee collection method from CampaignFactory
      const txHash = await factory.collectFeesFromAllCampaigns(feeDistributorAddress);
      
      toast({ title: 'Fees Collected!', description: `TX: ${txHash.slice(0, 10)}...` });

      // Update balances after fee collection
      const campaign = getCampaignContract(testState.campaignAddress, wallet);
      const [total, withdrawable, fees] = await Promise.all([
        campaign.getTotalBalance(),
        campaign.getWithdrawableBalance(),
        campaign.getFeeBalances()
      ]);

      setTestState(prev => ({
        ...prev,
        step: 5,
        balances: {
          total: total.eth,
          withdrawable: withdrawable.eth,
          fees: fees.eth
        }
      }));

    } catch (error) {
      console.error('Failed to collect fees:', error);
      toast({ title: 'Error', description: 'Failed to collect fees', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const refreshBalances = async () => {
    if (!wallet || !testState.campaignAddress) return;

    try {
      setLoading(true);
      toast({ title: 'Refreshing Balances...', description: 'Fetching latest data from blockchain' });
      
      const campaign = getCampaignContract(testState.campaignAddress, wallet);
      
      // Check campaign status first
      const deadline = await campaign.getDeadline();
      const now = Math.floor(Date.now() / 1000);
      const isActive = now < deadline;
      const timeLeft = deadline - now;
      console.log('Campaign status during balance refresh:', { 
        deadline, 
        now, 
        isActive, 
        timeLeft,
        deadlineDate: new Date(deadline * 1000).toLocaleString(),
        nowDate: new Date(now * 1000).toLocaleString(),
        shouldBeExpired: timeLeft <= 0
      });
      
      const [total, withdrawable, fees] = await Promise.all([
        campaign.getTotalBalance(),
        campaign.getWithdrawableBalance(),
        campaign.getFeeBalances()
      ]);

      console.log('Manual balance refresh:', { total: total.eth, withdrawable: withdrawable.eth, fees: fees.eth });

      setTestState(prev => ({
        ...prev,
        balances: {
          total: total.eth,
          withdrawable: withdrawable.eth,
          fees: fees.eth
        }
      }));
      
      toast({ title: 'Balances Updated!', description: `Total: ${total.eth} ETH` });
    } catch (error) {
      console.error('Failed to refresh balances:', error);
      toast({ title: 'Refresh Failed', description: 'Could not update balances from blockchain', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetTest = () => {
    stopCountdown();
    setTestState({
      step: 0,
      campaignAddress: '',
      campaignId: '',
      balances: { total: '0', withdrawable: '0', fees: '0' },
      donations: [],
      isActive: false,
      timeLeft: 0
    });
  };

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Contract Flow Test</h1>
          <p className="text-gray-600">
            Test the complete campaign lifecycle from creation to fee collection
          </p>
          {testState.testMode && (
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
              Test Mode: Duration in seconds instead of days
            </Badge>
          )}
          {testState.testMode === false && (
            <Badge variant="outline" className="bg-green-100 text-green-800">
              Production Mode: Duration in days
            </Badge>
          )}
        </div>

        {/* Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Test Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={(testState.step / 5) * 100} className="h-2" />
              <div className="flex justify-between text-sm">
                {stepTitles.map((title, index) => (
                  <span
                    key={index}
                    className={`${
                      index <= testState.step ? 'text-freeflow-600 font-semibold' : 'text-gray-400'
                    }`}
                  >
                    {title}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Load Existing Contract */}
          <Card>
            <CardHeader>
              <CardTitle>Load Existing Contract</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Campaign Contract Address</Label>
                <Input
                  value={contractInput}
                  onChange={(e) => setContractInput(e.target.value)}
                  placeholder="0x..."
                  disabled={loading}
                />
              </div>
              <Button 
                onClick={loadExistingContract}
                disabled={loading || !contractInput.trim()}
                className="w-full"
              >
                {loading ? 'Loading...' : 'Load Contract'}
              </Button>
            </CardContent>
          </Card>

          {/* Test Parameters */}
          <Card>
            <CardHeader>
              <CardTitle>Test Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Campaign Title</Label>
                <Input
                  value={testParams.title}
                  onChange={(e) => setTestParams(prev => ({ ...prev, title: e.target.value }))}
                  disabled={testState.step > 0}
                />
              </div>
              <div>
                <Label>Goal (ETH)</Label>
                <Input
                  value={testParams.goal}
                  onChange={(e) => setTestParams(prev => ({ ...prev, goal: e.target.value }))}
                  disabled={testState.step > 0}
                />
              </div>
              <div>
                <Label>Duration (seconds)</Label>
                <Input
                  value={testParams.duration}
                  onChange={(e) => setTestParams(prev => ({ ...prev, duration: e.target.value }))}
                  disabled={testState.step > 0}
                />
              </div>
              <div>
                <Label>Donation Amount (ETH)</Label>
                <Input
                  value={testParams.donationAmount}
                  onChange={(e) => setTestParams(prev => ({ ...prev, donationAmount: e.target.value }))}
                  disabled={testState.step > 1}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Gas Limit</Label>
                  <Input
                    value={testParams.gasLimit}
                    onChange={(e) => setTestParams(prev => ({ ...prev, gasLimit: e.target.value }))}
                    placeholder="200000"
                  />
                </div>
                <div>
                  <Label>Gas Price (gwei)</Label>
                  <Input
                    value={testParams.gasPrice}
                    onChange={(e) => setTestParams(prev => ({ ...prev, gasPrice: e.target.value }))}
                    placeholder="20"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Campaign Status
                {testState.campaignAddress && (
                  <Button variant="outline" size="sm" onClick={refreshBalances}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {testState.campaignAddress && (
                <>
                  <div className="text-sm">
                    <span className="text-gray-600">Campaign:</span>
                    <div className="mt-1 p-2 bg-gray-100 rounded font-mono text-xs break-all">
                      {testState.campaignAddress}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(testState.campaignAddress)}
                      className="mt-1 h-6"
                    >
                      Copy Address
                    </Button>
                  </div>
                  
                  {testState.isActive && (
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-green-600" />
                      <span className="text-green-600 font-semibold">
                        {formatTime(testState.timeLeft)} remaining
                      </span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Balance:</span>
                      <span className="font-semibold">{testState.balances.total} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Withdrawable:</span>
                      <span className="font-semibold text-green-600">{testState.balances.withdrawable} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fees:</span>
                      <span className="font-semibold text-yellow-600">{testState.balances.fees} ETH</span>
                    </div>
                  </div>
                </>
              )}

              {testState.donations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Donations:</h4>
                  {testState.donations.map((donation, index) => (
                    <div key={index} className="text-sm flex justify-between">
                      <span>{donation.amount} ETH</span>
                      <span className="text-gray-500">{donation.timestamp.toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Contract Status */}
        <Card>
          <CardHeader>
            <CardTitle>Contract Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Network:</span>
                <span className="font-mono">testnet</span>
              </div>
              <div className="flex justify-between">
                <span>CampaignFactory:</span>
                <span className="font-mono text-xs">0xb7fc...b763</span>
              </div>
              <div className="flex justify-between">
                <span>Your Address:</span>
                <span className="font-mono text-xs">{wallet?.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : 'Not connected'}</span>
              </div>
              <div className="flex justify-between">
                <span>Gas Settings:</span>
                <span className="text-xs">{testParams.gasLimit} gas @ {testParams.gasPrice} gwei</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Test Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {/* Step 1: Create Campaign */}
              <Button
                onClick={step1_CreateCampaign}
                disabled={loading || testState.step !== 0 || !wallet}
                className="flex items-center"
              >
                <Play className="w-4 h-4 mr-2" />
                1. Create Campaign
              </Button>

              {/* Step 2: Make Donation */}
              <Button
                onClick={step2_MakeDonation}
                disabled={loading || testState.step !== 1 || !testState.isActive}
                variant="outline"
              >
                <Coins className="w-4 h-4 mr-2" />
                2. Make Donation
              </Button>

              {/* Step 3: Wait for End */}
              <Button
                onClick={step3_WaitForEnd}
                disabled={testState.step !== 2 || testState.isActive}
                variant="outline"
              >
                <Clock className="w-4 h-4 mr-2" />
                3. Campaign Ended
              </Button>

              {/* Step 4: Withdraw Funds */}
              <Button
                onClick={step4_WithdrawFunds}
                disabled={loading || testState.step !== 3}
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                4. Withdraw Funds
              </Button>

              {/* Step 5: Collect Fees */}
              <Button
                onClick={step5_CollectFees}
                disabled={loading || testState.step !== 4}
                variant="outline"
              >
                <Coins className="w-4 h-4 mr-2" />
                5. Collect Fees {wallet && wallet.address.toLowerCase() !== ENV.OWNER_ADDRESS?.toLowerCase() && "(Owner Only)"}
              </Button>

              {/* Reset */}
              <Button onClick={resetTest} variant="ghost">
                Reset Test
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        {!wallet && (
          <Alert>
            <AlertDescription>
              Please connect your wallet to run the test flow.
            </AlertDescription>
          </Alert>
        )}

        {testState.step === 5 && (
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">
              ✅ Complete test flow successful! Campaign created, donated to, funds withdrawn, and fees collected.
              Notice how fees remained accessible even after campaign owner withdrawal.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </PageContainer>
  );
}
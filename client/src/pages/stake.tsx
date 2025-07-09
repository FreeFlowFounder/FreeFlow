import { useState } from 'react';
import { Coins, TrendingUp, Lock, Award, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageContainer } from '@/components/page-container';
import { useWallet } from '@/hooks/use-wallet';

export default function Stake() {
  const { wallet } = useWallet();
  const [stakeAmount, setStakeAmount] = useState('');
  const [isStaking, setIsStaking] = useState(false);

  const handleStake = async () => {
    if (!wallet) return;
    
    setIsStaking(true);
    try {
      // TODO: Implement actual staking logic
      await new Promise(resolve => setTimeout(resolve, 2000));
      setStakeAmount('');
    } finally {
      setIsStaking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <PageContainer>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Stake FLW Tokens</h1>
            <p className="text-lg text-gray-600">
              Stake your FLW tokens to earn rewards and help secure the network
            </p>
          </div>

          <Alert className="mb-8">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-1">FLW Token Staking - Coming Soon!</p>
              <p className="text-sm">
                FLW token staking functionality is currently in development. 
                Stay tuned for updates on launch dates and staking rewards.
              </p>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Staking Interface */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Coins className="w-5 h-5 mr-2" />
                  Stake FLW Tokens
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="stake-amount">Amount to Stake</Label>
                  <Input
                    id="stake-amount"
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="Enter FLW amount"
                    disabled={true}
                  />
                  <p className="text-sm text-gray-500">
                    Available: 0 FLW
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Estimated APY</span>
                    <span className="text-sm font-medium">12.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Lock Period</span>
                    <span className="text-sm font-medium">30 days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Minimum Stake</span>
                    <span className="text-sm font-medium">100 FLW</span>
                  </div>
                </div>

                <Button
                  className="w-full bg-freeflow-900 hover:bg-freeflow-800 text-white"
                  onClick={handleStake}
                  disabled={!wallet || isStaking || true} // Disabled until FLW is available
                >
                  {isStaking ? 'Staking...' : 'Stake FLW'}
                </Button>

                {!wallet && (
                  <p className="text-sm text-gray-500 text-center">
                    Connect your wallet to stake FLW tokens
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Staking Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Staking Statistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-freeflow-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Staked</p>
                    <p className="text-2xl font-bold text-freeflow-900">0 FLW</p>
                  </div>
                  <div className="bg-freeflow-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Your Stake</p>
                    <p className="text-2xl font-bold text-freeflow-900">0 FLW</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Stakers</span>
                    <span className="text-sm font-medium">0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Network APY</span>
                    <span className="text-sm font-medium">12.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Your Rewards</span>
                    <span className="text-sm font-medium">0 FLW</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Staking Benefits */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="w-5 h-5 mr-2" />
                Staking Benefits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-freeflow-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <TrendingUp className="w-6 h-6 text-freeflow-900" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Earn Rewards</h3>
                  <p className="text-sm text-gray-600">
                    Earn passive income by staking your FLW tokens with competitive APY rates
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-freeflow-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Lock className="w-6 h-6 text-freeflow-900" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Network Security</h3>
                  <p className="text-sm text-gray-600">
                    Help secure the FreeFlow network and contribute to decentralization
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-freeflow-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Award className="w-6 h-6 text-freeflow-900" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Governance Rights</h3>
                  <p className="text-sm text-gray-600">
                    Participate in governance decisions and help shape the future of FreeFlow
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Stakes */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Your Active Stakes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Stakes</h3>
                <p className="text-gray-500">
                  You don't have any active stakes yet. Start staking to earn rewards!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Info, AlertCircle, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getCampaignContract } from '@/lib/contracts';
import { useWallet } from '@/hooks/use-wallet';
import { useCryptoPrices, formatUSDValue } from '@/hooks/use-crypto-prices';
import { useToast } from '@/hooks/use-toast';

interface BalanceDisplayProps {
  campaignAddress: string;
  campaignOwner: string;
  className?: string;
}

export function BalanceDisplay({ 
  campaignAddress, 
  campaignOwner,
  className = "" 
}: BalanceDisplayProps) {
  const { wallet } = useWallet();
  const { eth } = useCryptoPrices();
  const { toast } = useToast();
  const [balances, setBalances] = useState({
    withdrawable: { eth: '0', tokens: {} },
    fees: { eth: '0', tokens: {} },
    total: { eth: '0', tokens: {} }
  });
  const [loading, setLoading] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [campaignEnded, setCampaignEnded] = useState(false);

  const isOwner = wallet?.address?.toLowerCase() === campaignOwner.toLowerCase();

  useEffect(() => {
    loadBalances();
    checkCampaignEnd();
  }, [campaignAddress, wallet]);

  const checkCampaignEnd = async () => {
    if (!wallet) return;

    try {
      const contract = getCampaignContract(campaignAddress, wallet);
      const deadline = await contract.getDeadline();
      const now = Math.floor(Date.now() / 1000);
      
      setCampaignEnded(now >= deadline);
      
      // Set up interval to check deadline every second (like old frontend)
      const interval = setInterval(() => {
        const currentTime = Math.floor(Date.now() / 1000);
        if (currentTime >= deadline) {
          setCampaignEnded(true);
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    } catch (error) {
      console.error('Failed to check campaign deadline:', error);
    }
  };

  const loadBalances = async () => {
    if (!wallet) return;

    try {
      setLoading(true);
      const contract = getCampaignContract(campaignAddress, wallet);
      
      const [withdrawable, fees, total] = await Promise.all([
        contract.getWithdrawableBalance(),
        contract.getFeeBalances(),
        contract.getTotalBalance()
      ]);

      setBalances({ withdrawable, fees, total });
    } catch (error) {
      console.error('Failed to load balances:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!wallet || !isOwner || !campaignEnded) return;

    try {
      setWithdrawing(true);
      const contract = getCampaignContract(campaignAddress, wallet);
      
      toast({ 
        title: 'Withdrawing Funds...', 
        description: 'Transaction submitted to blockchain' 
      });
      
      const txHash = await contract.withdraw();
      
      toast({ 
        title: 'Funds Withdrawn!', 
        description: `Transaction: ${txHash.slice(0, 10)}...` 
      });

      // Refresh balances after withdrawal
      await loadBalances();
      
    } catch (error) {
      console.error('Failed to withdraw funds:', error);
      toast({ 
        title: 'Withdrawal Failed', 
        description: 'Please try again or check console for details',
        variant: 'destructive' 
      });
    } finally {
      setWithdrawing(false);
    }
  };

  const hasUncollectedFees = parseFloat(balances.fees.eth) > 0;
  const withdrawableUSD = parseFloat(balances.withdrawable.eth) * eth;
  const feesUSD = parseFloat(balances.fees.eth) * eth;
  const totalUSD = parseFloat(balances.total.eth) * eth;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Campaign Balance</span>
          {loading && <Badge variant="outline">Loading...</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Withdrawable Balance - What campaign owner can actually withdraw */}
        <div className="p-4 border rounded-lg bg-green-50 border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-green-800">Available to Withdraw</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="inline-flex items-center">
                    <Info className="w-4 h-4 text-green-600" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Amount the campaign owner can withdraw (excludes platform fees)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="text-xl font-bold text-green-800">
            {balances.withdrawable.eth} ETH
          </div>
          <div className="text-sm text-green-600">
            {formatUSDValue(withdrawableUSD)}
          </div>
        </div>

        {/* Fee Balance - Platform fees (if any) */}
        {hasUncollectedFees && (
          <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-yellow-800">Platform Fees</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="inline-flex items-center">
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Fees held in contract for platform collection</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-lg font-semibold text-yellow-800">
              {balances.fees.eth} ETH
            </div>
            <div className="text-sm text-yellow-600">
              {formatUSDValue(feesUSD)}
            </div>
          </div>
        )}

        {/* Total Balance */}
        <div className="p-4 border rounded-lg bg-gray-50 border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-800">Total in Contract</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="inline-flex items-center">
                    <Info className="w-4 h-4 text-gray-600" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Total amount held in the campaign contract</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="text-lg font-semibold text-gray-800">
            {balances.total.eth} ETH
          </div>
          <div className="text-sm text-gray-600">
            {formatUSDValue(totalUSD)}
          </div>
        </div>

        {/* Warning for owners after campaign ends */}
        {isOwner && campaignEnded && hasUncollectedFees && (
          <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-800 font-medium">
                  Notice: Platform fees remain in contract
                </p>
                <p className="text-sm text-blue-600 mt-1">
                  After you withdraw your funds, the platform fees will remain in the contract 
                  for the FreeFlow team to collect. This is normal and expected behavior.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Withdraw button - only for campaign owner when campaign ended */}
        {isOwner && campaignEnded && parseFloat(balances.withdrawable.eth) > 0 && (
          <Button
            onClick={handleWithdraw}
            disabled={withdrawing}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {withdrawing ? (
              'Withdrawing...'
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Withdraw {balances.withdrawable.eth} ETH
              </>
            )}
          </Button>
        )}

        {/* Refresh button */}
        <Button
          onClick={loadBalances}
          variant="outline"
          className="w-full"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh Balance'}
        </Button>
      </CardContent>
    </Card>
  );
}
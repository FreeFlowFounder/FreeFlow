import { ArrowRight, Clock, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Campaign } from '@/types/campaign';
import { useCryptoPrices, calculateUSDValue, formatUSDValue } from '@/hooks/use-crypto-prices';

interface CampaignCardProps {
  campaign: Campaign;
  onClick: () => void;
}

export function CampaignCard({ campaign, onClick }: CampaignCardProps) {
  const { eth, usdc, isLoading } = useCryptoPrices();

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

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Calculate USD values for raised and goal amounts
  const raisedUSD = calculateUSDValue(campaign.raised, 'ETH', { eth, usdc });
  const goalUSD = calculateUSDValue(campaign.goal, 'ETH', { eth, usdc });

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer" onClick={onClick}>
      {campaign.imageUrl && (
        <img
          src={campaign.imageUrl}
          alt={campaign.title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
      )}
      
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {getStatusBadge()}
            {campaign.timeLeft && (
              <Badge variant="outline" className="text-orange-800 border-orange-200">
                <Clock className="w-3 h-3 mr-1" />
                {campaign.timeLeft}
              </Badge>
            )}
          </div>
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-freeflow-900 transition-colors line-clamp-2">
          {campaign.title}
        </h3>
        
        <div className="flex items-center space-x-2 mb-4">
          {campaign.acceptedTokens.map((token) => (
            <Badge key={token} className="bg-freeflow-900 text-white">
              {token}
            </Badge>
          ))}
        </div>
        
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Progress</span>
            <span className="text-gray-900 font-medium">{campaign.progress}%</span>
          </div>
          <Progress value={campaign.progress} className="h-2" />
          <div className="flex justify-between text-sm mt-1">
            <div className="text-gray-600">
              <div>{campaign.raised} ETH raised</div>
              {!isLoading && raisedUSD > 0 && (
                <div className="text-xs text-gray-500">{formatUSDValue(raisedUSD)}</div>
              )}
            </div>
            <div className="text-gray-600 text-right">
              <div>Goal: {campaign.goal} ETH</div>
              {!isLoading && goalUSD > 0 && (
                <div className="text-xs text-gray-500">{formatUSDValue(goalUSD)}</div>
              )}
            </div>
          </div>
        </div>
        
        <div className="text-sm text-gray-500 mb-4">
          Creator: {formatAddress(campaign.creator)}
        </div>
        
        <Button className="w-full bg-freeflow-900 hover:bg-freeflow-800 text-white">
          View Campaign
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}

import { useState } from 'react';
import { useLocation } from 'wouter';
import { Rocket, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageContainer } from '@/components/page-container';
import { ImageUploader } from '@/components/image-uploader';
import { useWallet } from '@/hooks/use-wallet';
import { useToast } from '@/hooks/use-toast';
import { useCryptoPrices } from '@/hooks/use-crypto-prices';
import { CreateCampaignData } from '@/types/campaign';
import { getCampaignFactoryContract } from '@/lib/contracts';
import { ENV } from '@/lib/env';

export default function CreateCampaign() {
  const [, setLocation] = useLocation();
  const { wallet } = useWallet();
  const { toast } = useToast();
  const { eth, isLoading: pricesLoading } = useCryptoPrices();
  
  const [formData, setFormData] = useState<CreateCampaignData>({
    title: '',
    description: '',
    goal: '',
    duration: 30,
    imageUrl: '',
    acceptedTokens: ['ETH', 'USDC'],
  });
  
  const [usdGoal, setUsdGoal] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate ETH equivalent from USD goal
  const ethGoalEquivalent = usdGoal && eth > 0 ? (parseFloat(usdGoal) / eth).toFixed(4) : '0';

  const handleInputChange = (field: keyof CreateCampaignData, value: string | number | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTokenToggle = (token: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      acceptedTokens: checked
        ? [...prev.acceptedTokens, token]
        : prev.acceptedTokens.filter(t => t !== token),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!usdGoal || parseFloat(usdGoal) <= 0) {
      toast({
        title: 'Invalid Goal',
        description: 'Please enter a valid USD funding goal.',
        variant: 'destructive',
      });
      return;
    }
    
    // Set the ETH equivalent as the goal for the smart contract
    const finalFormData = {
      ...formData,
      goal: ethGoalEquivalent,
    };
    
    if (!wallet) {
      toast({
        title: 'Wallet Required',
        description: 'Please connect your wallet to create a campaign',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.title || !formData.description || !formData.goal) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (formData.acceptedTokens.length === 0) {
      toast({
        title: 'No Tokens Selected',
        description: 'Please select at least one token for donations',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Deploy campaign using smart contract
      const campaignFactory = getCampaignFactoryContract(wallet);
      
      toast({
        title: 'Deploying Campaign...',
        description: 'Creating your campaign on the blockchain. This may take a few minutes.',
      });
      
      const txHash = await campaignFactory.createCampaign(
        finalFormData.goal,
        finalFormData.duration,
        finalFormData.title,
        finalFormData.description,
        finalFormData.imageUrl || ''
      );
      
      toast({
        title: 'Campaign Created!',
        description: `Your campaign has been successfully deployed! Transaction: ${txHash}`,
      });
      
      setLocation('/campaigns');
    } catch (error: any) {
      console.error('Campaign creation error:', error);
      
      let errorMessage = 'Failed to create campaign. Please try again.';
      if (error.message?.includes('user rejected')) {
        errorMessage = 'Transaction was cancelled by user.';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds to deploy campaign.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: 'Creation Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <PageContainer>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Create Your Campaign</h1>
            <p className="text-lg text-gray-600">
              Launch your fundraising campaign in minutes with our simple, powerful tools
            </p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Campaign Title */}
                <div>
                  <Label htmlFor="title" className="text-sm font-medium text-gray-700 mb-2">
                    Campaign Title *
                  </Label>
                  <Input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter a compelling title for your campaign"
                    className="focus:ring-freeflow-500 focus:border-freeflow-500"
                    required
                  />
                </div>
                
                {/* Campaign Description */}
                <div>
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Describe your campaign, its goals, and why people should support it"
                    className="min-h-[120px] focus:ring-freeflow-500 focus:border-freeflow-500"
                    required
                  />
                </div>
                
                {/* Goal and Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="usd-goal" className="text-sm font-medium text-gray-700 mb-2">
                      Funding Goal (USD) *
                    </Label>
                    <Input
                      id="usd-goal"
                      type="number"
                      step="100"
                      value={usdGoal}
                      onChange={(e) => {
                        setUsdGoal(e.target.value);
                        handleInputChange('goal', ethGoalEquivalent);
                      }}
                      placeholder="25000"
                      className="focus:ring-freeflow-500 focus:border-freeflow-500"
                      required
                    />
                    {usdGoal && !pricesLoading && eth > 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        ≈ {ethGoalEquivalent} ETH at current price
                      </p>
                    )}
                    {pricesLoading && (
                      <p className="text-sm text-gray-400 mt-1">Loading current ETH price...</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="duration" className="text-sm font-medium text-gray-700 mb-2">
                      Duration (Days) *
                    </Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration}
                      onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                      placeholder="30"
                      className="focus:ring-freeflow-500 focus:border-freeflow-500"
                      min="1"
                      max="365"
                      required
                    />
                  </div>
                </div>
                
                {/* Image Upload */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">
                    Campaign Image
                  </Label>
                  <ImageUploader
                    onImageUpload={(url) => handleInputChange('imageUrl', url)}
                    currentImage={formData.imageUrl}
                    onRemoveImage={() => handleInputChange('imageUrl', '')}
                  />
                </div>
                
                {/* USD Goal Explanation */}
                <Alert className="bg-blue-50 border-blue-200">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>Multi-Token Support:</strong> Your goal is set in USD to make progress tracking clear across multiple currencies. 
                    Supporters can donate in ETH, USDC, and eventually FLW tokens, with all contributions counting toward your USD goal.
                  </AlertDescription>
                </Alert>

                {/* Accepted Tokens */}
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-3">
                    Accepted Donation Tokens
                  </Label>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="eth"
                        checked={formData.acceptedTokens.includes('ETH')}
                        onCheckedChange={(checked) => handleTokenToggle('ETH', checked as boolean)}
                      />
                      <Label htmlFor="eth" className="text-sm text-gray-700">ETH</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="usdc"
                        checked={formData.acceptedTokens.includes('USDC')}
                        onCheckedChange={(checked) => handleTokenToggle('USDC', checked as boolean)}
                      />
                      <Label htmlFor="usdc" className="text-sm text-gray-700">USDC</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="flw"
                        checked={formData.acceptedTokens.includes('FLW')}
                        onCheckedChange={(checked) => handleTokenToggle('FLW', checked as boolean)}
                        disabled={!ENV.ALLOW_FLW}
                      />
                      <Label htmlFor="flw" className={`text-sm ${ENV.ALLOW_FLW ? 'text-gray-700' : 'text-gray-500'}`}>
                        FLW {!ENV.ALLOW_FLW && '(Coming Soon)'}
                      </Label>
                    </div>
                  </div>
                </div>
                
                {/* Platform Fee Notice */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-1">Platform Fee: 2% (0.5% for FLW donations)</p>
                    <p className="text-sm">Fees are automatically distributed to validators, team, and development fund.</p>
                  </AlertDescription>
                </Alert>
                
                {/* Submit Button */}
                <div className="pt-6">
                  <Button
                    type="submit"
                    className="w-full bg-freeflow-900 hover:bg-freeflow-800 text-white py-4 text-lg font-semibold"
                    disabled={isSubmitting || !wallet}
                  >
                    {isSubmitting ? (
                      'Creating Campaign...'
                    ) : (
                      <>
                        <Rocket className="w-5 h-5 mr-2" />
                        Create Campaign
                      </>
                    )}
                  </Button>
                  
                  {!wallet && (
                    <p className="text-sm text-gray-500 mt-2 text-center">
                      Please connect your wallet to create a campaign
                    </p>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </div>
  );
}

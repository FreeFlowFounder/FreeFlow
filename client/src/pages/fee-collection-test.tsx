import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/hooks/use-wallet';
import { PageContainer } from '@/components/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getAddress } from '@/lib/contract-config';

const OWNER_ADDRESS = "0x535f7b11e4F9B77d8ef04A564e09E0B4feE75fb3";

const factoryAbi = [
  "function getAllCampaigns() view returns (address[])",
  "function collectFeesFromAllCampaigns(address to) external",
  "function owner() view returns (address)"
];

const campaignAbi = [
  "function getFeeBalances() view returns (uint256,uint256)",
  "function campaignOwner() view returns (address)",
  "function owner() view returns (address)",
  "function deadline() view returns (uint256)"
];

export default function FeeCollectionTest() {
  const { wallet } = useWallet();
  const [status, setStatus] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [feeData, setFeeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (wallet) {
      setIsOwner(wallet.address.toLowerCase() === OWNER_ADDRESS.toLowerCase());
    }
  }, [wallet]);

  const loadCampaigns = async () => {
    if (!wallet) return;
    
    setLoading(true);
    try {
      const factoryAddress = getAddress("CampaignFactory");
      const factory = new ethers.Contract(factoryAddress, factoryAbi, wallet.provider);
      
      const campaignAddresses = await factory.getAllCampaigns();
      setCampaigns(campaignAddresses);
      
      const feeInfo = [];
      for (const address of campaignAddresses) {
        try {
          const campaign = new ethers.Contract(address, campaignAbi, wallet.provider);
          const [ethFees, flwFees] = await campaign.getFeeBalances();
          const deadline = await campaign.deadline();
          const now = Math.floor(Date.now() / 1000);
          const isEnded = now > Number(deadline);
          
          // Test both owner functions to see what the deployed contracts have
          let owner = null;
          let ownerFunction = 'none';
          let campaignOwnerResult = null;
          let ownerResult = null;
          
          // Test campaignOwner() function first
          try {
            campaignOwnerResult = await campaign.campaignOwner();
            console.log(`Campaign ${address} campaignOwner() SUCCESS: ${campaignOwnerResult}`);
            owner = campaignOwnerResult;
            ownerFunction = 'campaignOwner()';
          } catch (campaignOwnerErr) {
            console.log(`Campaign ${address} campaignOwner() FAILED:`, campaignOwnerErr.message);
          }
          
          // Test owner() function second
          try {
            ownerResult = await campaign.owner();
            console.log(`Campaign ${address} owner() SUCCESS: ${ownerResult}`);
            if (!owner) {
              owner = ownerResult;
              ownerFunction = 'owner()';
            }
          } catch (ownerErr) {
            console.log(`Campaign ${address} owner() FAILED:`, ownerErr.message);
          }
          
          // Compare results if both worked
          if (campaignOwnerResult && ownerResult) {
            const same = campaignOwnerResult.toLowerCase() === ownerResult.toLowerCase();
            console.log(`Campaign ${address} - campaignOwner() and owner() return ${same ? 'SAME' : 'DIFFERENT'} addresses`);
            console.log(`  campaignOwner(): ${campaignOwnerResult}`);
            console.log(`  owner(): ${ownerResult}`);
            ownerFunction = 'both (campaignOwner used)';
          }
          
          feeInfo.push({
            address,
            ethFees: ethers.formatEther(ethFees),
            flwFees: ethers.formatUnits(flwFees, 18),
            owner: owner || 'unknown',
            ownerFunction,
            isEnded,
            isOwnedByYou: owner ? owner.toLowerCase() === wallet.address.toLowerCase() : false
          });
        } catch (err) {
          console.warn(`Could not load campaign ${address}:`, err);
        }
      }
      
      setFeeData(feeInfo);
      setStatus(`Loaded ${campaignAddresses.length} campaigns`);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      setStatus('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const testFeeCollection = async () => {
    if (!wallet) return;
    
    setLoading(true);
    try {
      const factoryAddress = getAddress("CampaignFactory");
      const feeDistributorAddress = getAddress("FeeDistributor");
      
      // Use exact same approach as original working frontend
      const factoryAbiExtended = [
        "function collectFeesFromAllCampaigns(address to) external"
      ];
      
      const factory = new ethers.Contract(factoryAddress, factoryAbiExtended, wallet.signer);
      
      setStatus('Collecting all fees from campaigns...');
      
      const tx = await factory.collectFeesFromAllCampaigns(feeDistributorAddress, {
        gasLimit: 3000000 // Exact same gas limit as original
      });
      
      setStatus('Transaction sent, waiting for confirmation...');
      await tx.wait();
      setStatus('All campaign fees collected to FeeDistributor.');
      
      // Refresh data after collection
      setTimeout(() => {
        loadCampaigns();
      }, 2000);
      
    } catch (error: any) {
      console.error('Fee collection failed:', error);
      
      let errorMessage = 'Unknown error';
      if (error.reason) {
        errorMessage = error.reason;
      } else if (error.data) {
        errorMessage = error.data;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setStatus(`Fee collection failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const totalEthFees = feeData.reduce((sum, campaign) => sum + parseFloat(campaign.ethFees || '0'), 0);
  const totalFlwFees = feeData.reduce((sum, campaign) => sum + parseFloat(campaign.flwFees || '0'), 0);
  const campaignsWithFees = feeData.filter(c => parseFloat(c.ethFees) > 0 || parseFloat(c.flwFees) > 0);
  const ownedCampaigns = feeData.filter(c => c.isOwnedByYou);

  return (
    <PageContainer>
      <div className="container mx-auto p-6 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Fee Collection Test</h1>
        
        {!isOwner && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            Access denied. You are not the owner.
          </div>
        )}
        
        {isOwner && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Summary</CardTitle>
                  <CardDescription>Overview of all campaigns</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p><strong>Total Campaigns:</strong> {campaigns.length}</p>
                    <p><strong>Campaigns with Fees:</strong> {campaignsWithFees.length}</p>
                    <p><strong>Campaigns You Own:</strong> {ownedCampaigns.length}</p>
                    <p><strong>Total ETH Fees:</strong> {totalEthFees.toFixed(4)} ETH</p>
                    <p><strong>Total FLW Fees:</strong> {totalFlwFees.toFixed(4)} FLW</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                  <CardDescription>Fee collection operations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={loadCampaigns} 
                    disabled={loading || !wallet}
                    className="w-full"
                  >
                    {loading ? 'Loading...' : 'Load Campaigns'}
                  </Button>
                  
                  <Button 
                    onClick={testFeeCollection} 
                    disabled={loading || !wallet || totalEthFees === 0}
                    className="w-full"
                    variant="destructive"
                  >
                    {loading ? 'Processing...' : 'Test Fee Collection'}
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Campaign Details</CardTitle>
                <CardDescription>Individual campaign fee information</CardDescription>
              </CardHeader>
              <CardContent>
                {feeData.length === 0 ? (
                  <p>No campaigns loaded. Click "Load Campaigns" to start.</p>
                ) : (
                  <div className="space-y-4">
                    {feeData.map((campaign, index) => (
                      <div key={campaign.address} className="border rounded p-4">
                        <h4 className="font-semibold mb-2">Campaign {index + 1}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p><strong>Address:</strong> {campaign.address.slice(0, 8)}...{campaign.address.slice(-6)}</p>
                            <p><strong>Owner:</strong> {campaign.owner === 'unknown' ? 'Unknown' : `${campaign.owner.slice(0, 8)}...${campaign.owner.slice(-6)}`}</p>
                            <p><strong>Owner Function:</strong> {campaign.ownerFunction}</p>
                            <p><strong>You Own:</strong> {campaign.isOwnedByYou ? 'Yes' : 'No'}</p>
                            <p><strong>Status:</strong> {campaign.isEnded ? 'Ended' : 'Active'}</p>
                          </div>
                          <div>
                            <p><strong>ETH Fees:</strong> {campaign.ethFees} ETH</p>
                            <p><strong>FLW Fees:</strong> {campaign.flwFees} FLW</p>
                            <p><strong>Has Fees:</strong> {(parseFloat(campaign.ethFees) > 0 || parseFloat(campaign.flwFees) > 0) ? 'Yes' : 'No'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-mono bg-gray-100 p-3 rounded">{status || 'Ready'}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PageContainer>
  );
}
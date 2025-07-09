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
  "function owner() view returns (address)",
  "function getCampaignCount() view returns (uint256)",
  "function testMode() view returns (bool)"
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

  const testSimpleContractCall = async () => {
    if (!wallet) return;
    
    setLoading(true);
    setStatus('Testing simple contract calls...');
    
    try {
      const factoryAddress = getAddress("CampaignFactory");
      const factory = new ethers.Contract(factoryAddress, factoryAbi, wallet.provider);
      
      console.log('=== TESTING SIMPLE CONTRACT CALLS ===');
      
      // Test read-only calls first
      try {
        const campaignCount = await factory.getCampaignCount();
        console.log('✅ getCampaignCount() works:', campaignCount.toString());
        
        const campaigns = await factory.getAllCampaigns();
        console.log('✅ getAllCampaigns() works:', campaigns.length, 'campaigns');
        
        const contractOwner = await factory.owner();
        console.log('✅ owner() works:', contractOwner);
        
        const isOwner = contractOwner.toLowerCase() === wallet.address.toLowerCase();
        console.log('✅ Ownership check:', isOwner ? 'YOU ARE OWNER' : 'YOU ARE NOT OWNER');
        
        if (isOwner) {
          setStatus('✅ You are the factory owner - but fee collection still fails');
        } else {
          setStatus(`❌ You are NOT the factory owner. Owner: ${contractOwner}`);
        }
        
      } catch (error: any) {
        console.log('❌ Basic contract calls failed:', error.message);
        setStatus(`❌ Basic contract calls failed: ${error.message}`);
      }
      
    } catch (error: any) {
      console.error('Simple contract test failed:', error);
      setStatus(`Simple contract test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testOwnershipIssue = async () => {
    if (!wallet) return;
    
    setLoading(true);
    try {
      const factoryAddress = getAddress("CampaignFactory");
      const factory = new ethers.Contract(factoryAddress, [
        "function owner() view returns (address)",
        "function collectFeesFromAllCampaigns(address to) external"
      ], wallet.provider);
      
      const contractOwner = await factory.owner();
      console.log('=== OWNERSHIP DEBUG ===');
      console.log('Contract owner:', contractOwner);
      console.log('Your wallet:', wallet.address);
      console.log('Are addresses equal?', contractOwner.toLowerCase() === wallet.address.toLowerCase());
      console.log('Platform owner from ENV:', OWNER_ADDRESS);
      
      // Check character by character comparison
      console.log('=== DETAILED ADDRESS COMPARISON ===');
      console.log('Contract owner length:', contractOwner.length);
      console.log('Your wallet length:', wallet.address.length);
      console.log('Contract owner (lowercase):', contractOwner.toLowerCase());
      console.log('Your wallet (lowercase):', wallet.address.toLowerCase());
      console.log('ENV owner (lowercase):', OWNER_ADDRESS.toLowerCase());
      
      // Check if your wallet matches ENV owner
      console.log('Your wallet matches ENV owner:', wallet.address.toLowerCase() === OWNER_ADDRESS.toLowerCase());
      console.log('Contract owner matches ENV owner:', contractOwner.toLowerCase() === OWNER_ADDRESS.toLowerCase());
      
      // Test direct address comparison
      if (contractOwner.toLowerCase() !== wallet.address.toLowerCase()) {
        console.log('❌ ADDRESSES DO NOT MATCH - This is the problem!');
        console.log('Expected (your wallet):', wallet.address.toLowerCase());
        console.log('Actual (contract owner):', contractOwner.toLowerCase());
        console.log('Difference found at character:');
        for (let i = 0; i < Math.max(contractOwner.length, wallet.address.length); i++) {
          if (contractOwner.toLowerCase()[i] !== wallet.address.toLowerCase()[i]) {
            console.log(`Position ${i}: Expected '${wallet.address.toLowerCase()[i]}', Got '${contractOwner.toLowerCase()[i]}'`);
            break;
          }
        }
      } else {
        console.log('✅ ADDRESSES MATCH - The problem is elsewhere');
      }
      
      // Test gas estimation to see exact error
      const factoryWithSigner = new ethers.Contract(factoryAddress, [
        "function collectFeesFromAllCampaigns(address to) external"
      ], wallet.signer);
      
      const feeDistributorAddress = getAddress("FeeDistributor");
      
      try {
        const gasEstimate = await factoryWithSigner.collectFeesFromAllCampaigns.estimateGas(feeDistributorAddress);
        console.log('✅ Gas estimation successful:', gasEstimate.toString());
        console.log('This means the function call should work!');
        setStatus('✅ Gas estimation successful - function should work!');
      } catch (gasError: any) {
        console.log('❌ Gas estimation failed:', gasError);
        console.log('Error message:', gasError.message);
        console.log('Error reason:', gasError.reason);
        console.log('Error code:', gasError.code);
        
        if (gasError.message.includes('caller is not the owner')) {
          setStatus(`❌ FOUND THE ISSUE: Contract thinks you're not the owner. Contract owner: ${contractOwner}, Your wallet: ${wallet.address}`);
        } else {
          setStatus(`❌ Different error: ${gasError.message}`);
        }
      }
      
    } catch (error) {
      console.error('Ownership test failed:', error);
      setStatus('Ownership test failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

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
          } catch (campaignOwnerErr: any) {
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
          } catch (ownerErr: any) {
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
      
      console.log('=== TESTING FEE COLLECTION ===');
      console.log('Factory address:', factoryAddress);
      console.log('FeeDistributor address:', feeDistributorAddress);
      console.log('Your wallet:', wallet.address);
      
      // First check if there are actually fees to collect
      console.log('Checking campaigns for collectable fees...');
      await loadCampaigns();
      
      let totalFeesToCollect = 0;
      let endedCampaignsWithFees = 0;
      
      for (const campaign of feeData) {
        const ethFees = parseFloat(campaign.ethFees);
        if (ethFees > 0) {
          totalFeesToCollect += ethFees;
          if (campaign.isEnded) {
            endedCampaignsWithFees++;
          }
          console.log(`Campaign ${campaign.address}: ${ethFees} ETH fees, ended: ${campaign.isEnded}, owned by you: ${campaign.isOwnedByYou}`);
        }
      }
      
      console.log(`Total fees to collect: ${totalFeesToCollect} ETH`);
      console.log(`Ended campaigns with fees: ${endedCampaignsWithFees}`);
      
      if (totalFeesToCollect === 0) {
        setStatus('No fees to collect - all campaigns have 0 ETH fees');
        setLoading(false);
        return;
      }
      
      if (endedCampaignsWithFees === 0) {
        setStatus('No ended campaigns with fees - fees can only be collected after campaigns end');
        setLoading(false);
        return;
      }
      
      // Use exact same approach as original working frontend
      const factoryAbiExtended = [
        "function owner() view returns (address)",
        "function collectFeesFromAllCampaigns(address to) external"
      ];
      
      const factory = new ethers.Contract(factoryAddress, factoryAbiExtended, wallet.signer);
      
      // Double check factory owner
      const factoryOwner = await factory.owner();
      console.log('Factory owner:', factoryOwner);
      console.log('Your wallet:', wallet.address);
      console.log('Factory owner matches your wallet:', factoryOwner.toLowerCase() === wallet.address.toLowerCase());
      
      if (factoryOwner.toLowerCase() !== wallet.address.toLowerCase()) {
        setStatus(`❌ You are not the factory owner. Factory owner: ${factoryOwner}, Your wallet: ${wallet.address}`);
        setLoading(false);
        return;
      }
      
      setStatus('Collecting all fees from campaigns...');
      
      const tx = await factory.collectFeesFromAllCampaigns(feeDistributorAddress, {
        gasLimit: 3000000 // Exact same gas limit as original
      });
      
      console.log('Transaction sent:', tx.hash);
      setStatus('Transaction sent, waiting for confirmation...');
      
      const receipt = await tx.wait();
      console.log('Transaction receipt:', receipt);
      
      if (receipt.status === 1) {
        setStatus('✅ All campaign fees collected to FeeDistributor successfully!');
      } else {
        setStatus('❌ Transaction failed - status 0');
      }
      
      // Refresh data after collection
      setTimeout(() => {
        loadCampaigns();
      }, 2000);
      
    } catch (error: any) {
      console.error('Fee collection failed:', error);
      
      // More detailed error analysis
      let errorMessage = 'Unknown error';
      if (error.reason) {
        errorMessage = error.reason;
      } else if (error.data) {
        errorMessage = error.data;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Check if it's the specific "Not owner" error
      if (error.message && error.message.includes('Not owner')) {
        setStatus('❌ Fee collection failed: Contract says you are not the owner');
      } else if (error.message && error.message.includes('execution reverted')) {
        setStatus('❌ Fee collection failed: Transaction reverted (likely no fees to collect or access control issue)');
      } else {
        setStatus(`Fee collection failed: ${errorMessage}`);
      }
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
                    onClick={testOwnershipIssue} 
                    disabled={loading || !wallet}
                    className="w-full"
                    variant="secondary"
                  >
                    {loading ? 'Testing...' : 'Test Ownership Issue'}
                  </Button>
                  
                  <Button 
                    onClick={testSimpleContractCall} 
                    disabled={loading || !wallet}
                    className="w-full"
                    variant="outline"
                  >
                    {loading ? 'Testing...' : 'Test Simple Contract Call'}
                  </Button>
                  
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
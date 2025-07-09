import { useState } from 'react';
import { ethers } from 'ethers';
import { PageContainer } from '@/components/page-container';
import { useWallet } from '@/hooks/use-wallet';
import { getCampaignFactoryContract } from '@/lib/contracts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ENV } from '@/lib/env';

export default function FeeCollectionDebug() {
  const { wallet } = useWallet();
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const compareContractStates = async () => {
    if (!wallet) return;
    
    setLoading(true);
    setStatus('Comparing testnet vs mainnet contract states...');
    
    try {
      // Test the exact same contract calls that worked on testnet
      const factory = getCampaignFactoryContract(wallet);
      
      console.log('=== TESTNET VS MAINNET COMPARISON ===');
      console.log('Testing contract with address:', factory.getAddress());
      
      // Check all the basic contract properties
      const factoryContract = new ethers.Contract(
        factory.getAddress(),
        [
          "function owner() view returns (address)",
          "function feeDistributor() view returns (address)",
          "function testMode() view returns (bool)",
          "function getAllCampaigns() view returns (address[])"
        ],
        wallet.provider
      );
      
      const [owner, feeDistributor, testMode, campaigns] = await Promise.all([
        factoryContract.owner(),
        factoryContract.feeDistributor(),
        factoryContract.testMode(),
        factoryContract.getAllCampaigns()
      ]);
      
      console.log('Contract owner:', owner);
      console.log('Your address:', wallet.address);
      console.log('Are you owner?', owner.toLowerCase() === wallet.address.toLowerCase());
      console.log('Fee distributor:', feeDistributor);
      console.log('Test mode:', testMode);
      console.log('Total campaigns:', campaigns.length);
      
      // The key difference: testnet worked, mainnet doesn't
      // Let's check if there's a different access control mechanism
      console.log('=== TESTING ACCESS CONTROL ===');
      
      // Try to call collectFeesFromAllCampaigns in a read-only way to see the error
      const collectContract = new ethers.Contract(
        factory.getAddress(),
        [
          "function collectFeesFromAllCampaigns(address to) external"
        ],
        wallet.signer
      );
      
      // Test with estimateGas first (this won't execute but will show us access control issues)
      try {
        const gasEstimate = await collectContract.collectFeesFromAllCampaigns.estimateGas(feeDistributor);
        console.log('✅ Gas estimate successful:', gasEstimate.toString());
        console.log('This means access control is OK, the function should work');
        setStatus('✅ Access control looks good! Function should work.');
      } catch (gasError: any) {
        console.log('❌ Gas estimation failed:', gasError.message);
        console.log('This reveals the access control issue');
        
        // Check if it's an "Ownable: caller is not the owner" error
        if (gasError.message.includes('caller is not the owner')) {
          console.log('🔍 FOUND THE PROBLEM: Ownable access control is rejecting your call');
          console.log('🔍 This means the contract owner on mainnet is different from your wallet');
          console.log('🔍 Contract owner:', owner);
          console.log('🔍 Your wallet:', wallet.address);
          setStatus(`❌ Access denied: Contract owner is ${owner}, but you are ${wallet.address}`);
        } else {
          console.log('🔍 Different error:', gasError.message);
          setStatus(`❌ Access control error: ${gasError.message}`);
        }
      }
      
    } catch (error) {
      console.error('Contract comparison failed:', error);
      setStatus('Contract comparison failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  const testFactoryPermissions = async () => {
    if (!wallet) return;
    
    setLoading(true);
    setStatus('Testing factory permissions...');
    
    try {
      const factory = getCampaignFactoryContract(wallet);
      const { CONTRACT_ADDRESSES } = await import('@/lib/contracts');
      
      console.log('=== FACTORY PERMISSION TEST ===');
      console.log('Factory address:', factory.getAddress());
      console.log('FeeDistributor address:', CONTRACT_ADDRESSES.FEE_DISTRIBUTOR);
      console.log('Platform owner:', ENV.OWNER_ADDRESS);
      console.log('Your address:', wallet.address);
      
      // Check factory owner
      const factoryOwner = await factory.getOwner();
      console.log('Factory owner from contract:', factoryOwner);
      console.log('Are you factory owner?', factoryOwner.toLowerCase() === wallet.address.toLowerCase());
      
      // Get all campaigns
      const campaigns = await factory.getAllCampaigns();
      console.log('Total campaigns:', campaigns.length);
      
      // Check fee balances in campaigns
      let totalFees = 0;
      let campaignsWithFees = 0;
      
      for (const campaignAddress of campaigns) {
        try {
          const campaign = new ethers.Contract(campaignAddress, [
            "function getFeeBalances() view returns (uint256, uint256)",
            "function campaignOwner() view returns (address)",
            "function deadline() view returns (uint256)"
          ], wallet.provider);
          
          const [ethFees] = await campaign.getFeeBalances();
          const owner = await campaign.campaignOwner();
          const deadline = await campaign.deadline();
          const now = Math.floor(Date.now() / 1000);
          const isEnded = now > Number(deadline);
          
          const ethFeesAmount = parseFloat(ethers.formatEther(ethFees));
          if (ethFeesAmount > 0) {
            campaignsWithFees++;
            totalFees += ethFeesAmount;
            console.log(`Campaign ${campaignAddress}:`);
            console.log(`  - Owner: ${owner}`);
            console.log(`  - ETH Fees: ${ethFeesAmount}`);
            console.log(`  - Ended: ${isEnded}`);
            console.log(`  - Owner is platform: ${owner.toLowerCase() === ENV.OWNER_ADDRESS.toLowerCase()}`);
            console.log(`  - Owner is you: ${owner.toLowerCase() === wallet.address.toLowerCase()}`);
          }
        } catch (error) {
          console.error(`Failed to check campaign ${campaignAddress}:`, error);
        }
      }
      
      console.log(`Found ${campaignsWithFees} campaigns with fees, total: ${totalFees} ETH`);
      
      if (totalFees === 0) {
        setStatus('No fees to collect in any campaigns');
        setLoading(false);
        return;
      }
      
      // Test the exact testnet approach
      setStatus('Testing fee collection with testnet approach...');
      
      // Try collecting fees with the same method that worked on testnet
      const factoryContract = new ethers.Contract(
        factory.getAddress(),
        [
          "function owner() view returns (address)",
          "function collectFeesFromAllCampaigns(address to) external"
        ],
        wallet.signer
      );
      
      // Check if we can call the function (this should work if contracts are identical)
      console.log('Testing collectFeesFromAllCampaigns call...');
      
      // Try with high gas limit like testnet
      const gasLimit = 3000000;
      console.log(`Using gas limit: ${gasLimit}`);
      
      const tx = await factoryContract.collectFeesFromAllCampaigns(
        CONTRACT_ADDRESSES.FEE_DISTRIBUTOR,
        { gasLimit }
      );
      
      console.log('Transaction sent:', tx.hash);
      setStatus('Fee collection transaction sent! Waiting for confirmation...');
      
      await tx.wait();
      setStatus('✅ Fee collection successful! Just like testnet.');
      
    } catch (error: any) {
      console.error('Fee collection test failed:', error);
      
      // Extract more detailed error information
      let errorDetails = 'Unknown error';
      if (error.reason) {
        errorDetails = error.reason;
      } else if (error.message) {
        errorDetails = error.message;
      }
      
      console.log('=== ERROR ANALYSIS ===');
      console.log('Error type:', error.constructor.name);
      console.log('Error message:', error.message);
      console.log('Error reason:', error.reason);
      console.log('Error data:', error.data);
      
      // Check if it's a specific contract error
      if (error.message.includes('execution reverted')) {
        console.log('TRANSACTION REVERTED - This suggests the contract rejected the call');
        console.log('This could mean:');
        console.log('1. Access control is different on mainnet');
        console.log('2. Contract configuration is different');
        console.log('3. There are no fees to collect');
      }
      
      setStatus(`❌ Fee collection failed: ${errorDetails}`);
    } finally {
      setLoading(false);
    }
  };

  const checkContractConfiguration = async () => {
    if (!wallet) return;
    
    setLoading(true);
    setStatus('Checking contract configuration...');
    
    try {
      const factory = getCampaignFactoryContract(wallet);
      const { CONTRACT_ADDRESSES } = await import('@/lib/contracts');
      
      console.log('=== CONTRACT CONFIGURATION CHECK ===');
      
      // Check if factory has the right configuration
      const factoryContract = new ethers.Contract(
        factory.getAddress(),
        [
          "function owner() view returns (address)",
          "function feeDistributor() view returns (address)",
          "function testMode() view returns (bool)"
        ],
        wallet.provider
      );
      
      const [factoryOwner, feeDistributor, testMode] = await Promise.all([
        factoryContract.owner(),
        factoryContract.feeDistributor(),
        factoryContract.testMode()
      ]);
      
      console.log('Factory owner:', factoryOwner);
      console.log('Configured fee distributor:', feeDistributor);
      console.log('Expected fee distributor:', CONTRACT_ADDRESSES.FEE_DISTRIBUTOR);
      console.log('Test mode:', testMode);
      console.log('Fee distributor matches:', feeDistributor.toLowerCase() === CONTRACT_ADDRESSES.FEE_DISTRIBUTOR.toLowerCase());
      
      setStatus(`Configuration check complete. Test mode: ${testMode}, Fee distributor matches: ${feeDistributor.toLowerCase() === CONTRACT_ADDRESSES.FEE_DISTRIBUTOR.toLowerCase()}`);
      
    } catch (error) {
      console.error('Configuration check failed:', error);
      setStatus('Configuration check failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  if (!wallet) {
    return (
      <PageContainer>
        <Card>
          <CardHeader>
            <CardTitle>Fee Collection Debug</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please connect your wallet to debug fee collection.</p>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Fee Collection Debug</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <strong>Platform Owner:</strong> {ENV.OWNER_ADDRESS}
              </div>
              <div>
                <strong>Your Address:</strong> {wallet.address}
              </div>
              <div>
                <strong>Status:</strong> {status}
              </div>
              <div className="flex gap-2">
                <Button onClick={compareContractStates} disabled={loading}>
                  {loading ? 'Comparing...' : 'Compare Contract States'}
                </Button>
                <Button onClick={checkContractConfiguration} disabled={loading}>
                  {loading ? 'Checking...' : 'Check Contract Config'}
                </Button>
                <Button onClick={testFactoryPermissions} disabled={loading}>
                  {loading ? 'Testing...' : 'Test Fee Collection'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageContainer } from '@/components/page-container';
import { useWallet } from '@/hooks/use-wallet';
import { useToast } from '@/hooks/use-toast';
import { ethers } from 'ethers';

export default function ContractDebug() {
  const { wallet } = useWallet();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [contractAddress, setContractAddress] = useState('');
  const [results, setResults] = useState<any[]>([]);

  // Minimal ABI just for testing basic functions (fixed format)
  const MINIMAL_ABI = [
    "function campaignOwner() view returns (address)",
    "function goal() view returns (uint256)", 
    "function deadline() view returns (uint256)",
    "function donateETH() payable",
    "function ethFeesCollected() view returns (uint256)"
    // Note: receive() function doesn't need to be in ABI for direct ETH sends
  ];

  const addResult = (test: string, success: boolean, data?: any) => {
    setResults(prev => [...prev, { test, success, data, timestamp: new Date() }]);
  };

  const testContract = async () => {
    if (!wallet || !contractAddress) {
      toast({ title: 'Error', description: 'Connect wallet and enter contract address' });
      return;
    }

    try {
      setLoading(true);
      setResults([]);
      
      const contract = new ethers.Contract(contractAddress, MINIMAL_ABI, wallet.signer);
      
      // Test 1: Check if contract exists
      try {
        const code = await wallet.provider.getCode(contractAddress);
        addResult('Contract Exists', code !== '0x', { codeLength: code.length });
      } catch (error) {
        addResult('Contract Exists', false, { error: error.message });
      }

      // Test 2: Read campaign owner
      try {
        const owner = await contract.campaignOwner();
        addResult('Read Campaign Owner', true, { owner });
      } catch (error) {
        addResult('Read Campaign Owner', false, { error: error.message });
      }

      // Test 3: Read goal
      try {
        const goal = await contract.goal();
        addResult('Read Goal', true, { goal: ethers.formatEther(goal) });
      } catch (error) {
        addResult('Read Goal', false, { error: error.message });
      }

      // Test 4: Read deadline
      try {
        const deadline = await contract.deadline();
        const deadlineDate = new Date(Number(deadline) * 1000);
        const isActive = Date.now() / 1000 < Number(deadline);
        addResult('Read Deadline', true, { 
          deadline: deadline.toString(),
          deadlineDate: deadlineDate.toISOString(),
          isActive 
        });
      } catch (error) {
        addResult('Read Deadline', false, { error: error.message });
      }

      // Test 5: Check balance
      try {
        const balance = await wallet.provider.getBalance(contractAddress);
        addResult('Contract Balance', true, { balance: ethers.formatEther(balance) });
      } catch (error) {
        addResult('Contract Balance', false, { error: error.message });
      }

      // Test 6: Check fees collected
      try {
        const fees = await contract.ethFeesCollected();
        addResult('Fees Collected', true, { fees: ethers.formatEther(fees) });
      } catch (error) {
        addResult('Fees Collected', false, { error: error.message });
      }

    } catch (error) {
      console.error('Contract test failed:', error);
      toast({ title: 'Error', description: 'Contract test failed' });
    } finally {
      setLoading(false);
    }
  };

  const testDonation = async () => {
    if (!wallet || !contractAddress) return;

    try {
      setLoading(true);
      const contract = new ethers.Contract(contractAddress, MINIMAL_ABI, wallet.signer);

      // Try direct ETH send (triggers receive function)
      try {
        const tx = await wallet.signer.sendTransaction({
          to: contractAddress,
          value: ethers.parseEther('0.01'), // Small test amount
          gasLimit: 100000
        });
        
        addResult('Direct ETH Send', true, { 
          txHash: tx.hash,
          amount: '0.01 ETH'
        });
        
        toast({ title: 'Success!', description: `TX: ${tx.hash.slice(0, 10)}...` });
      } catch (error) {
        addResult('Direct ETH Send', false, { error: error.message });
      }

    } catch (error) {
      console.error('Donation test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Contract Debugger</h1>
          <p className="text-gray-600">Test contract functions individually</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contract Testing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Contract Address</Label>
              <Input
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                placeholder="0x..."
                className="font-mono"
              />
              <div className="flex gap-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setContractAddress('0xb7fcfdff9e396f1c0c7bea1a3d6acae5116bf763')}
                >
                  Use Factory Address
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open('/test-flow', '_blank')}
                >
                  Create Campaign First
                </Button>
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={testContract}
                disabled={loading || !wallet || !contractAddress}
              >
                {loading ? 'Testing...' : 'Test Contract Functions'}
              </Button>

              <Button 
                onClick={testDonation}
                disabled={loading || !wallet || !contractAddress}
                variant="outline"
              >
                Test Small Donation (0.01 ETH)
              </Button>
            </div>

            {wallet && (
              <div className="text-sm text-gray-600">
                Connected: {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
              </div>
            )}
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {results.map((result, index) => (
                  <div 
                    key={index}
                    className={`p-3 rounded border ${
                      result.success 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`font-medium ${
                        result.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {result.success ? '✅' : '❌'} {result.test}
                      </span>
                      <span className="text-xs text-gray-500">
                        {result.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    
                    {result.data && (
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
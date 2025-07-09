import { Wallet, Link, University, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/use-wallet';
import { useToast } from '@/hooks/use-toast';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { connectMetaMask, connectWalletConnect, connectCoinbaseWallet, isConnecting, error } = useWallet();
  const { toast } = useToast();

  const handleConnect = async (connectFn: () => Promise<void>, walletName: string) => {
    try {
      await connectFn();
      onClose();
      toast({
        title: 'Wallet Connected',
        description: `Successfully connected to ${walletName}`,
      });
    } catch (err) {
      toast({
        title: 'Connection Failed',
        description: err instanceof Error ? err.message : `Failed to connect to ${walletName}`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            Connect Your Wallet
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* MetaMask */}
          <Button
            className="w-full flex items-center justify-between p-4 h-auto border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            variant="outline"
            onClick={() => handleConnect(connectMetaMask, 'MetaMask')}
            disabled={isConnecting}
          >
            <div className="flex items-center">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium text-gray-900">MetaMask</span>
            </div>
            {isConnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span className="text-sm text-gray-500">Popular</span>
            )}
          </Button>

          {/* WalletConnect */}
          <Button
            className="w-full flex items-center justify-between p-4 h-auto border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            variant="outline"
            onClick={() => handleConnect(connectWalletConnect, 'WalletConnect')}
            disabled={isConnecting}
          >
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                <Link className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium text-gray-900">WalletConnect</span>
            </div>
            {isConnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span className="text-sm text-gray-500">Scan QR</span>
            )}
          </Button>

          {/* Coinbase Wallet */}
          <Button
            className="w-full flex items-center justify-between p-4 h-auto border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            variant="outline"
            onClick={() => handleConnect(connectCoinbaseWallet, 'Coinbase Wallet')}
            disabled={isConnecting}
          >
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <University className="w-4 h-4 text-white" />
              </div>
              <span className="font-medium text-gray-900">Coinbase Wallet</span>
            </div>
            {isConnecting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span className="text-sm text-gray-500">Mobile</span>
            )}
          </Button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            By connecting a wallet, you agree to FreeFlow's Terms of Service
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

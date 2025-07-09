import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { WalletInfo, walletManager } from '@/lib/wallet';

interface WalletContextType {
  wallet: WalletInfo | null;
  isConnecting: boolean;
  error: string | null;
  connectMetaMask: () => Promise<void>;
  connectWalletConnect: () => Promise<void>;
  connectCoinbaseWallet: () => Promise<void>;
  disconnect: () => void;
  switchToBaseChain: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectMetaMask = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const walletInfo = await walletManager.connectMetaMask();
      setWallet(walletInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const connectWalletConnect = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const walletInfo = await walletManager.connectWalletConnect();
      setWallet(walletInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const connectCoinbaseWallet = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const walletInfo = await walletManager.connectCoinbaseWallet();
      setWallet(walletInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    walletManager.disconnect();
    setWallet(null);
    setError(null);
  };

  const switchToBaseChain = async () => {
    setError(null);
    
    try {
      await walletManager.switchToBaseChain();
      // Refresh wallet info after chain switch
      if (wallet) {
        const provider = walletManager.getProvider();
        if (provider) {
          const network = await provider.getNetwork();
          setWallet(prev => prev ? { ...prev, chainId: network.chainId } : null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch chain');
    }
  };

  // Check if wallet is already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            await connectMetaMask();
          }
        } catch (err) {
          console.error('Failed to check wallet connection:', err);
        }
      }
    };

    checkConnection();
  }, []);

  return (
    <WalletContext.Provider
      value={{
        wallet,
        isConnecting,
        error,
        connectMetaMask,
        connectWalletConnect,
        connectCoinbaseWallet,
        disconnect,
        switchToBaseChain,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

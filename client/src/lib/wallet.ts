import { ethers } from 'ethers';

export interface WalletInfo {
  address: string;
  chainId: number;
  balance: string;
  provider: ethers.BrowserProvider;
  signer: ethers.Signer;
}

export class WalletManager {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;

  async connectMetaMask(): Promise<WalletInfo> {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      
      const address = await this.signer.getAddress();
      const balance = await this.provider.getBalance(address);
      const network = await this.provider.getNetwork();

      return {
        address,
        chainId: Number(network.chainId),
        balance: ethers.formatEther(balance),
        provider: this.provider,
        signer: this.signer,
      };
    } catch (error) {
      console.error('Failed to connect to MetaMask:', error);
      throw new Error('Failed to connect to MetaMask');
    }
  }

  async connectWalletConnect(): Promise<WalletInfo> {
    // TODO: Implement WalletConnect integration
    // This would require @walletconnect/web3-provider
    throw new Error('WalletConnect integration not implemented yet');
  }

  async connectCoinbaseWallet(): Promise<WalletInfo> {
    // TODO: Implement Coinbase Wallet integration
    // This would require @coinbase/wallet-sdk
    throw new Error('Coinbase Wallet integration not implemented yet');
  }

  async switchToBaseChain(): Promise<void> {
    if (!this.provider) {
      throw new Error('No provider available');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }], // Base chain ID
      });
    } catch (error: any) {
      if (error.code === 4902) {
        // Chain not added to MetaMask
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x2105',
            chainName: 'Base',
            nativeCurrency: {
              name: 'Ethereum',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: ['https://mainnet.base.org'],
            blockExplorerUrls: ['https://basescan.org/'],
          }],
        });
      } else {
        throw error;
      }
    }
  }

  disconnect(): void {
    this.provider = null;
    this.signer = null;
  }

  getProvider(): ethers.BrowserProvider | null {
    return this.provider;
  }

  getSigner(): ethers.Signer | null {
    return this.signer;
  }
}

export const walletManager = new WalletManager();

// Add ethereum type to window
declare global {
  interface Window {
    ethereum?: any;
  }
}

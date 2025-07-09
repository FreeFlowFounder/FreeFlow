import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Wallet, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/use-wallet';
import { WalletModal } from './wallet-modal';
import { cn } from '@/lib/utils';
import { ENV } from '@/lib/env';

export function Navbar() {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const { wallet, disconnect } = useWallet();

  // Check if current user is the platform owner
  const isOwner = wallet?.address?.toLowerCase() === ENV.OWNER_ADDRESS?.toLowerCase();

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/campaigns', label: 'Browse' },
    { href: '/create', label: 'Start Campaign' },
    { href: '/my-campaigns', label: 'My Campaigns' },
    { href: '/stake', label: 'Stake' },
    ...(isOwner ? [
      { href: '/admin', label: 'Admin' },
      { href: '/test-flow', label: 'Test Flow' }
    ] : [])
  ];

  const isActive = (path: string) => {
    if (path === '/' && location === '/') return true;
    if (path !== '/' && location.startsWith(path)) return true;
    return false;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <>
      <nav className="bg-freeflow-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/">
                <span className="text-xl font-bold text-white hover:text-freeflow-100 transition-colors">
                  FreeFlow
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-8">
              {navItems.slice(1).map((item) => (
                <Link 
                  key={item.href} 
                  href={item.href}
                >
                  <span className={cn(
                    'transition-colors',
                    isActive(item.href)
                      ? 'text-white'
                      : 'text-gray-300 hover:text-white'
                  )}>
                    {item.label}
                  </span>
                </Link>
              ))}

              {/* Wallet Connection */}
              <div className="flex items-center space-x-3">
                {wallet ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm">{formatAddress(wallet.address)}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={disconnect}
                      className="text-white border-white hover:bg-white hover:text-freeflow-900"
                    >
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setIsWalletModalOpen(true)}
                    className="bg-freeflow-600 hover:bg-freeflow-700 text-white"
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Connect Wallet
                  </Button>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-white hover:bg-freeflow-800 p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div className="lg:hidden pb-4 pt-4 border-t border-freeflow-700">
              <div className="flex flex-col space-y-4">
                {navItems.slice(1).map((item) => (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className={cn(
                      'block py-3 px-2 rounded transition-colors text-lg',
                      isActive(item.href)
                        ? 'text-white bg-freeflow-700'
                        : 'text-gray-300 hover:text-white hover:bg-freeflow-800'
                    )}>
                      {item.label}
                    </span>
                  </Link>
                ))}
                
                <div className="pt-4 border-t border-freeflow-700 mt-4">
                  {wallet ? (
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-center space-x-2 px-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-sm text-gray-300">{formatAddress(wallet.address)}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          disconnect();
                          setIsMobileMenuOpen(false);
                        }}
                        className="text-white border-white hover:bg-white hover:text-freeflow-900 w-fit mx-2"
                      >
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => {
                        setIsWalletModalOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="bg-freeflow-600 hover:bg-freeflow-700 text-white w-full mx-2"
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      Connect Wallet
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
      />
    </>
  );
}

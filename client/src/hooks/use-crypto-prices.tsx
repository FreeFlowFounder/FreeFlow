import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface CryptoPrices {
  ethereum: { usd: number };
  'usd-coin': { usd: number };
}

interface PriceData {
  eth: number;
  usdc: number;
  isLoading: boolean;
  error: string | null;
}

async function fetchCryptoPrices(): Promise<CryptoPrices> {
  const response = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,usd-coin&vs_currencies=usd'
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch crypto prices');
  }
  
  return response.json();
}

export function useCryptoPrices(): PriceData {
  const { data, isLoading, error } = useQuery({
    queryKey: ['crypto-prices'],
    queryFn: fetchCryptoPrices,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 25000, // Consider data stale after 25 seconds
  });

  return {
    eth: data?.ethereum?.usd || 0,
    usdc: data?.['usd-coin']?.usd || 1, // USDC should always be ~$1
    isLoading,
    error: error?.message || null,
  };
}

// Utility function to calculate USD value for different tokens
export function calculateUSDValue(
  amount: string | number,
  token: 'ETH' | 'USDC' | 'FLW',
  prices: { eth: number; usdc: number }
): number {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  switch (token) {
    case 'ETH':
      return numAmount * prices.eth;
    case 'USDC':
      return numAmount * prices.usdc;
    case 'FLW':
      // For now, return 0 since FLW price isn't available
      // This can be updated when FLW gets listed on exchanges
      return 0;
    default:
      return 0;
  }
}

// Format USD value for display
export function formatUSDValue(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
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

  const ethPrice = data?.ethereum?.usd || 0;
  const usdcPrice = data?.['usd-coin']?.usd || 1;
  
  // Debug logging to track price source (can be removed in production)
  if (ethPrice > 0) {
    console.log(`useCryptoPrices: ETH price = $${ethPrice}, USDC price = $${usdcPrice}`);
  } else if (isLoading) {
    console.log(`useCryptoPrices: Loading prices, using fallback ETH price = $3000`);
  }

  return {
    eth: ethPrice || 3000, // Use reasonable fallback if price is 0
    usdc: usdcPrice || 1, // USDC should always be ~$1
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
  
  let usdValue = 0;
  switch (token) {
    case 'ETH':
      usdValue = numAmount * prices.eth;
      break;
    case 'USDC':
      usdValue = numAmount * prices.usdc;
      break;
    case 'FLW':
      // For now, return 0 since FLW price isn't available
      // This can be updated when FLW gets listed on exchanges
      usdValue = 0;
      break;
    default:
      usdValue = 0;
  }
  
  // Debug logging for USD calculations (can be removed in production)
  if (numAmount > 0) {
    console.log(`calculateUSDValue: ${numAmount} ${token} × $${token === 'ETH' ? prices.eth : prices.usdc} = $${usdValue.toFixed(2)}`);
  }
  return usdValue;
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
// Environment configuration for Windows compatibility
// If environment variables don't work, add your credentials here temporarily

// Option 1: Use environment variables (preferred)
const envPinataApiKey = import.meta.env.VITE_PINATA_API_KEY;
const envPinataSecret = import.meta.env.VITE_PINATA_SECRET;
const envNetwork = import.meta.env.VITE_NETWORK;
const envAllowFlw = import.meta.env.VITE_ALLOW_FLW;
const envOwnerAddress = import.meta.env.VITE_OWNER_ADDRESS;

// Option 2: If env vars don't work on Windows, uncomment and add your credentials:
// const envPinataApiKey = 'your_pinata_api_key_here';
// const envPinataSecret = 'your_pinata_secret_here';
// const envNetwork = 'testnet'; // or 'mainnet' for production
// const envAllowFlw = 'false'; // set to 'true' when FLW token is live
// const envOwnerAddress = 'your_wallet_address_here';

export const ENV = {
  PINATA_API_KEY: envPinataApiKey,
  PINATA_SECRET: envPinataSecret,
  NETWORK: envNetwork || 'testnet', // default to testnet if not set
  ALLOW_FLW: envAllowFlw === 'true', // convert string to boolean
  OWNER_ADDRESS: envOwnerAddress,
};
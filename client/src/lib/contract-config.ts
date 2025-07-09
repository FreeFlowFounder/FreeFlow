import { ENV } from './env';

export const NETWORK = ENV.NETWORK || "testnet";

interface ContractAddresses {
  [key: string]: {
    testnet: string;
    mainnet: string;
  };
}

export const CONTRACTS: ContractAddresses = {
  FLW: {
    testnet: "0xC474568411B2335C594B0CeE539F9f74C4103B18",
    mainnet: "0xYourMainnetFLWTokenAddress",
  },
  USDC: {
    testnet: "0xf175520C52418dfE19C8098071a252da48Cd1C19",
    mainnet: "0xYourMainnetUSDCTokenAddress",
  },  
  ValidatorStaking: {
    testnet: "0xea80a4fe6e6493e96f84fada2bde6313f5fbb280",
    mainnet: "0xYourMainnetStakingAddress",
  },
  CampaignFactory: {
    testnet: "0xb7fcfdff9e396f1c0c7bea1a3d6acae5116bf763",
    mainnet: "0xYourMainnetFactoryAddress",
  },
  FeeDistributor: {
    testnet: "0xd0875f419267bf80927160a7324c1dc94fbab269",
    mainnet: "0xYourMainnetFeeDistributorAddress",
  },
};

export const getAddress = (name: string): string => {
  return CONTRACTS[name]?.[NETWORK as keyof typeof CONTRACTS[string]] || '';
};
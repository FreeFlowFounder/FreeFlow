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
    mainnet: "0x84Ae3089F87CC1baa19586bB4C4059c7d24c648E",
  },
  USDC: {
    testnet: "0xf175520C52418dfE19C8098071a252da48Cd1C19",
    mainnet: "0x833589fCD6eDb6E08f4c7C32D4f71b54BdA02913",
  },  
  ValidatorStaking: {
    testnet: "0xea80a4fe6e6493e96f84fada2bde6313f5fbb280",
    mainnet: "0xd2df0cb6abf82925beadddcad517a4553be87f29",
  },
  CampaignFactory: {
    testnet: "0xb7fcfdff9e396f1c0c7bea1a3d6acae5116bf763",
    mainnet: "0xa17da4efd03a031b67244363ecb9211c30f01007",
  },
  FeeDistributor: {
    testnet: "0xd0875f419267bf80927160a7324c1dc94fbab269",
    mainnet: "0xa2b0ca15ff516be34222286d54152866880b8a0d",
  },
};

export const getAddress = (name: string): string => {
  return CONTRACTS[name]?.[NETWORK as keyof typeof CONTRACTS[string]] || '';
};
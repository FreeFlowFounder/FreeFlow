export const NETWORK = "testnet"; // Change to "mainnet" when ready

export const CONTRACTS = {
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
    testnet: "0x70d0cc05ac5c0fff3ea4ce5a74e9d55c26c667b4",
    mainnet: "0xYourMainnetFactoryAddress",
  },
  FeeDistributor: {
    testnet: "0xd0875f419267bf80927160a7324c1dc94fbab269",
    mainnet: "0xYourMainnetFeeDistributorAddress",
  },
};

export const getAddress = (name) => {
  return CONTRACTS[name]?.[NETWORK];
};

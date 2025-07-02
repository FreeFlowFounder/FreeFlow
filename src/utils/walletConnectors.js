import WalletConnectProvider from "@walletconnect/web3-provider";
import { createCoinbaseWalletSDK } from "@coinbase/wallet-sdk";
import { ethers } from "ethers";

const isTestnet = import.meta.env.VITE_NETWORK === "testnet";
const BASE_RPC = isTestnet
  ? "https://sepolia.base.org"
  : "https://mainnet.base.org";
const CHAIN_ID = isTestnet ? 84532 : 8453;

export async function connectWithWalletConnect() {
  const provider = new WalletConnectProvider({
    rpc: { [CHAIN_ID]: BASE_RPC }
  });
  await provider.enable();
  return new ethers.providers.Web3Provider(provider);
}

export async function connectWithCoinbase() {
  const coinbase = createCoinbaseWalletSDK({ appName: "FreeFlow" });
  const provider = coinbase.makeWeb3Provider(BASE_RPC, CHAIN_ID);
  await provider.enable();
  return new ethers.providers.Web3Provider(provider);
}

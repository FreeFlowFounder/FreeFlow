import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getAddress } from "../contract-config";
import PageContainer from "../components/PageContainer";


const factoryAbi = [
  "function getAllCampaigns() view returns (address[])"
];

const campaignAbi = [
  "function getFeeBalances() view returns (uint256,uint256)"
];


const feeDistributorAbi = [
  "function distributeETHManually(uint256 amount) external",
  "function distributeTokenManually(address token, uint256 amount) external",
  "function updateRecipients(address,address,address,address,address) external",
  "function owner() view returns (address)"
];

const erc20Abi = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

const OWNER_ADDRESS = "0x535f7b11e4F9B77d8ef04A564e09E0B4feE75fb3";

function FreeFlowOwnerPanel() {
  const [connectedWallet, setConnectedWallet] = useState("");
  const [flwBalance, setFlwBalance] = useState("");
  const [ethBalance, setEthBalance] = useState("");
  const [usdcBalance, setUsdcBalance] = useState("");
  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenAmount, setTokenAmount] = useState("");
  const [status, setStatus] = useState("");
  const [totalUncollectedEthFees, setTotalUncollectedEthFees] = useState("");
  const [totalUncollectedFlwFees, setTotalUncollectedFlwFees] = useState("");


  const [validatorWallet, setValidatorWallet] = useState("");
  const [teamWallet, setTeamWallet] = useState("");
  const [treasuryWallet, setTreasuryWallet] = useState("");
  const [marketingWallet, setMarketingWallet] = useState("");
  const [rndWallet, setRndWallet] = useState("");

  const feeDistributorAddress = getAddress("FeeDistributor");
  const flwTokenAddress = getAddress("FLW");
  const usdcTokenAddress = getAddress("USDC");
  
  async function handlePreviewUncollectedFees() {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const factoryAddress = getAddress("CampaignFactory");
      const factory = new ethers.Contract(factoryAddress, factoryAbi, provider);
      const campaigns = await factory.getAllCampaigns();

      let totalEth = ethers.BigNumber.from(0);
      let totalFlw = ethers.BigNumber.from(0);

      for (let addr of campaigns) {
  try {
    const campaign = new ethers.Contract(addr, campaignAbi, provider);
    const [ethFee, flwFee] = await campaign.getFeeBalances();
    totalEth = totalEth.add(ethFee);
    totalFlw = totalFlw.add(flwFee);
  } catch (err) {
    console.warn("Skipping campaign (could not read fees):", addr, err.message);
  }
}

      setTotalUncollectedEthFees(ethers.utils.formatEther(totalEth));
      setTotalUncollectedFlwFees(ethers.utils.formatUnits(totalFlw, 18));
      setStatus("Uncollected fees loaded.");
    } catch (err) {
      console.error(err);
      setStatus("Failed to load uncollected fees: " + err.message);
    }
  }

  useEffect(() => {
    init();
  }, []);

  async function init() {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const walletAddress = await signer.getAddress();
        setConnectedWallet(walletAddress);

        const feeDistributor = new ethers.Contract(feeDistributorAddress, feeDistributorAbi, provider);
        const flwToken = new ethers.Contract(flwTokenAddress, erc20Abi, provider);
        const balance = await flwToken.balanceOf(feeDistributorAddress);
        setFlwBalance(ethers.utils.formatUnits(balance, 18));
        
        const usdcToken = new ethers.Contract(usdcTokenAddress, erc20Abi, provider);
        const usdcBal = await usdcToken.balanceOf(feeDistributorAddress);
        setUsdcBalance(ethers.utils.formatUnits(usdcBal, 6)); // USDC has 6 decimals

        const ethBal = await provider.getBalance(feeDistributorAddress);
        setEthBalance(ethers.utils.formatEther(ethBal));
      } catch (err) {
        console.error(err);
      }
    }

  const isOwner = connectedWallet.toLowerCase() === OWNER_ADDRESS.toLowerCase();

  async function handleDistributeFLW() {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const feeDistributor = new ethers.Contract(feeDistributorAddress, feeDistributorAbi, signer);

      const flwToken = new ethers.Contract(flwTokenAddress, erc20Abi, provider);
      const balance = await flwToken.balanceOf(feeDistributorAddress);

      const tx = await feeDistributor.distributeTokenManually(flwTokenAddress, balance);
      setStatus("FLW distribution pending...");
      await tx.wait();
      setStatus("FLW distribution successful.");
    } catch (err) {
      console.error(err);
      setStatus("FLW distribution failed: " + err.message);
    }
  }

  async function handleDistributeETH() {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const feeDistributor = new ethers.Contract(feeDistributorAddress, feeDistributorAbi, signer);

      const amountWei = ethers.utils.parseEther(ethBalance);
      const tx = await feeDistributor.distributeETHManually(amountWei);
      setStatus("ETH distribution pending...");
      await tx.wait();
      setStatus("ETH distribution successful.");
    } catch (err) {
      console.error(err);
      setStatus("ETH distribution failed: " + err.message);
    }
  }

  async function handleDistributeUSDC() {
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const feeDistributor = new ethers.Contract(feeDistributorAddress, feeDistributorAbi, signer);

    const usdc = new ethers.Contract(usdcTokenAddress, erc20Abi, provider);
    const usdcBal = await usdc.balanceOf(feeDistributorAddress);

    const tx = await feeDistributor.distributeTokenManually(usdcTokenAddress, usdcBal);
    setStatus("USDC distribution pending...");
    await tx.wait();
    setStatus("USDC distribution successful.");
  } catch (err) {
    console.error(err);
    setStatus("USDC distribution failed: " + err.message);
  }
}


  async function handleDistributeToken() {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const feeDistributor = new ethers.Contract(feeDistributorAddress, feeDistributorAbi, signer);

      const token = new ethers.Contract(tokenAddress, erc20Abi, provider);
      const decimals = await token.decimals();
      const amountWei = ethers.utils.parseUnits(tokenAmount, decimals);

      const tx = await feeDistributor.distributeTokenManually(tokenAddress, amountWei);
      setStatus("Token distribution pending...");
      await tx.wait();
      setStatus("Token distribution successful.");
    } catch (err) {
      console.error(err);
      setStatus("Token distribution failed: " + err.message);
    }
  }

  async function handleUpdateRecipients() {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const feeDistributor = new ethers.Contract(feeDistributorAddress, feeDistributorAbi, signer);

      const tx = await feeDistributor.updateRecipients(
        validatorWallet,
        teamWallet,
        treasuryWallet,
        marketingWallet,
        rndWallet
      );
      setStatus("Recipient update pending...");
      await tx.wait();
      setStatus("Recipients updated successfully.");
    } catch (err) {
      console.error(err);
      setStatus("Update failed: " + err.message);
    }
  }
  async function handleCollectAllFees() {
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const factoryAddress = getAddress("CampaignFactory");
    const factoryAbiExtended = [
      "function collectFeesFromAllCampaigns(address to) external"
    ];
    const factory = new ethers.Contract(factoryAddress, factoryAbiExtended, signer);
    const tx = await factory.collectFeesFromAllCampaigns(feeDistributorAddress, {
  gasLimit: 3000000
});
    setStatus("Collecting all fees from campaigns...");
    await tx.wait();
    setStatus("All campaign fees collected to FeeDistributor.");
  } catch (err) {
    console.error(err);
    setStatus("Failed to collect campaign fees: " + err.message);
  }
}

  return (
    <PageContainer>
      <div style={{ padding: "2rem" }}>
        <h2>FreeFlow Owner Panel</h2>
        {!isOwner ? (
          <p style={{ color: "red" }}>Access denied. You are not the owner.</p>
        ) : (
          <>
            <p><strong>FeeDistributor:</strong> {feeDistributorAddress}</p>

            <p><strong>FLW in contract:</strong> {flwBalance} FLW</p>
            <button onClick={handleDistributeFLW} style={buttonStyle}>Distribute FLW</button>

            <p><strong>ETH in contract:</strong> {ethBalance} ETH</p>
            <button onClick={handleDistributeETH} style={buttonStyle}>Distribute ETH</button>

            <p><strong>USDC in contract:</strong> {usdcBalance} USDC</p>
            <button onClick={handleDistributeUSDC} style={buttonStyle}>Distribute USDC</button>

            <h4 style={{ marginTop: "2rem" }}>Uncollected Campaign Fees</h4>
            <button onClick={handlePreviewUncollectedFees} style={buttonStyle}>Preview Uncollected Fees</button>
            <p><strong>Total ETH Fees (Pending):</strong> {totalUncollectedEthFees} ETH</p>
            <p><strong>Total FLW Fees (Pending):</strong> {totalUncollectedFlwFees} FLW</p>

            <button onClick={handleCollectAllFees} style={buttonStyle}>Collect All Campaign Fees</button>
            

            <h4 style={{ marginTop: "2rem" }}>Distribute Custom Token</h4>
            <input
              type="text"
              placeholder="Token address"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Amount (in full units)"
              value={tokenAmount}
              onChange={(e) => setTokenAmount(e.target.value)}
              style={inputStyle}
            />
            <button onClick={handleDistributeToken} style={buttonStyle}>Distribute Token</button>

            <h4 style={{ marginTop: "2rem" }}>Update Recipient Wallets</h4>
            <input type="text" placeholder="Validator Pool" value={validatorWallet} onChange={(e) => setValidatorWallet(e.target.value)} style={inputStyle} />
            <input type="text" placeholder="Team Wallet" value={teamWallet} onChange={(e) => setTeamWallet(e.target.value)} style={inputStyle} />
            <input type="text" placeholder="Treasury Wallet" value={treasuryWallet} onChange={(e) => setTreasuryWallet(e.target.value)} style={inputStyle} />
            <input type="text" placeholder="Marketing Wallet" value={marketingWallet} onChange={(e) => setMarketingWallet(e.target.value)} style={inputStyle} />
            <input type="text" placeholder="R&D Wallet" value={rndWallet} onChange={(e) => setRndWallet(e.target.value)} style={inputStyle} />
            <button onClick={handleUpdateRecipients} style={buttonStyle}>Update Recipients</button>

            <p>{status}</p>
          </>
        )}
      </div>
    </PageContainer>
  );
}

const inputStyle = {
  padding: "0.5rem",
  width: "100%",
  fontSize: "1rem",
  marginBottom: "0.5rem"
};

const buttonStyle = {
  padding: "0.75rem 1.5rem",
  fontSize: "1rem",
  backgroundColor: "#081c3b",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer"
};

export default FreeFlowOwnerPanel;


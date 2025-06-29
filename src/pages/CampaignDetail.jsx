import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ethers } from "ethers";
import { getAddress } from "../contract-config";
import PageContainer from "../components/PageContainer";

const campaignAbi = [
  "function goal() view returns (uint256)",
  "function deadline() view returns (uint256)",
  "function campaignOwner() view returns (address)",
  "function title() view returns (string)",
  "function description() view returns (string)",
  "function imageUrl() view returns (string)",
  "function getUpdateCount() view returns (uint256)",
  "function getUpdate(uint256 index) view returns (string, uint256)",
  "function postUpdate(string memory newUpdate)",
  "function donateETH() payable",
  "function donateToken(address token, uint256 amount)",
  "function flwToken() view returns (address)",
  "function withdraw()"
];

const erc20Abi = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function decimals() view returns (uint8)"
];

function CampaignDetail() {
  const allowFLW = import.meta.env.VITE_ALLOW_FLW === "true";

  const { address } = useParams();
  const [goal, setGoal] = useState("");
  const [deadline, setDeadline] = useState("");
  const [status, setStatus] = useState("");
  const [isEnded, setIsEnded] = useState(false);
  const [ethRaised, setEthRaised] = useState("");
  const [usdTotal, setUsdTotal] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [updates, setUpdates] = useState([]);
  const [selectedToken, setSelectedToken] = useState("ETH");
  const [newUpdate, setNewUpdate] = useState("");

  let interval;
  async function fetchCampaignData() {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const campaign = new ethers.Contract(address, campaignAbi, provider);
      const goalWei = await campaign.goal();
      const deadlineUnix = await campaign.deadline();

      setGoal(ethers.utils.formatEther(goalWei));
      const deadlineDate = new Date(deadlineUnix.toNumber() * 1000);
      setDeadline(deadlineDate.toLocaleString());
      setIsEnded(deadlineDate < new Date());

      const signer = provider.getSigner();
      const currentUser = await signer.getAddress();
      const campaignOwner = await campaign.campaignOwner();
      setIsOwner(currentUser.toLowerCase() === campaignOwner.toLowerCase());

      const ethBalance = await provider.getBalance(address);
      const ethInEth = parseFloat(ethers.utils.formatEther(ethBalance));
      setEthRaised(ethInEth.toFixed(4));

      const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
      const prices = await res.json();
      const ethUsd = prices.ethereum?.usd || 0;
      const totalUsd = ethInEth * ethUsd;
      setUsdTotal(totalUsd.toFixed(2));

      setTitle(await campaign.title());
      setDescription(await campaign.description());
      setImageUrl(await campaign.imageUrl());

      const count = await campaign.getUpdateCount();
      const updatesFetched = [];
      for (let i = 0; i < count; i++) {
        const [message, timestamp] = await campaign.getUpdate(i);
        updatesFetched.push({ message, timestamp });
      }
      setUpdates(updatesFetched);

      interval = setInterval(() => {
        const now = new Date();
        if (now >= deadlineDate) {
          setIsEnded(true);
          clearInterval(interval);
        }
      }, 1000);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    fetchCampaignData();
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [address]);

  async function donate() {
    try {
      const amount = prompt(`Enter ${selectedToken} amount to donate:`);
      if (!amount) return;

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const campaign = new ethers.Contract(address, campaignAbi, signer);

      if (selectedToken === "ETH") {
        const tx = await campaign.donateETH({ value: ethers.utils.parseEther(amount) });
        await tx.wait();
      } else {
        const tokenAddress = getAddress(selectedToken);
        const token = new ethers.Contract(tokenAddress, erc20Abi, signer);
        const decimals = await token.decimals();
        const amountWei = ethers.utils.parseUnits(amount, decimals);

        const allowance = await token.allowance(await signer.getAddress(), address);
        if (allowance.lt(amountWei)) {
          const approveTx = await token.approve(address, amountWei);
          await approveTx.wait();
        }

        const tx = await campaign.donateToken(tokenAddress, amountWei);
        await tx.wait();
      }

      setStatus(`${selectedToken} donation successful.`);
      await fetchCampaignData();
    } catch (err) {
      console.error(err);
      setStatus(`${selectedToken} donation failed: ` + err.message);
    }
  }

  async function withdraw() {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const campaign = new ethers.Contract(address, campaignAbi, signer);
      const tx = await campaign.withdraw({ gasLimit: 100000 });
      await tx.wait();
      setStatus("Funds withdrawn successfully.");
      await fetchCampaignData();
    } catch (err) {
      console.error(err);
      setStatus("Withdrawal failed: " + err.message);
    }
  }

  async function submitUpdate() {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const campaign = new ethers.Contract(address, campaignAbi, signer);

      const tx = await campaign.postUpdate(newUpdate);
      await tx.wait();
      setStatus("Update posted.");
      setNewUpdate("");
      await fetchCampaignData();
    } catch (err) {
      console.error(err);
      setStatus("Failed to post update: " + err.message);
    }
  }

  return (
    <PageContainer>
      <div style={{ padding: "2rem" }}>
        <h2>{title}</h2>
        {imageUrl && <img src={imageUrl} alt="Campaign" style={{ maxWidth: "100%", borderRadius: "10px" }} />}
        <p>{description}</p>
        <p><strong>Goal:</strong> {goal} ETH</p>
        <p><strong>Deadline:</strong> {deadline} ({isEnded ? "Ended" : "Active"})</p>
        <p><strong>ETH Raised:</strong> {ethRaised || "0.0000"}</p>
        <p><strong>Total Raised (USD):</strong> ${usdTotal || "0.00"}</p>

        <div style={{ marginTop: "1rem" }}>
          <label>Select Token: </label>
          <select value={selectedToken} onChange={(e) => setSelectedToken(e.target.value)}>
            <option value="ETH">ETH</option>
            <option value="USDC">USDC</option>{allowFLW && <option value="FLW">FLW</option>}
          </select>
          <button onClick={donate} style={buttonStyle}>Donate</button>
        {!allowFLW && (
          <p style={{ fontSize: "0.9rem", color: "gray" }}>
            FLW donations will be enabled once the token is live.
          </p>
        )}

        </div>

        {isOwner && isEnded && (
          <div style={{ marginTop: "1rem" }}>
            <button onClick={withdraw} style={buttonStyle}>Withdraw</button>
          </div>
        )}

        <div style={{ marginTop: "2rem" }}>
          <h4>Campaign Updates</h4>
          {updates.length === 0 ? (
            <p>No updates yet.</p>
          ) : (
            updates.map((u, i) => (
              <div key={i} style={{ marginBottom: "1rem" }}>
                <p style={{ fontWeight: "bold" }}>{new Date(u.timestamp * 1000).toLocaleString()}</p>
                <p>{u.message}</p>
              </div>
            ))
          )}

          {isOwner && !isEnded && (
            <div style={{ marginTop: "1.5rem" }}>
              <textarea
                value={newUpdate}
                onChange={(e) => setNewUpdate(e.target.value)}
                placeholder="Write an update..."
                style={{ width: "100%", height: "100px", marginBottom: "0.5rem", padding: "0.5rem" }}
              />
              <button onClick={submitUpdate} style={buttonStyle}>Post Update</button>
            </div>
          )}
        </div>

        <p>{status}</p>
      </div>
    </PageContainer>
  );
}

const buttonStyle = {
  padding: "0.6rem 1.2rem",
  fontSize: "1rem",
  margin: "0.5rem",
  backgroundColor: "#081c3b",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer"
};

export default CampaignDetail;




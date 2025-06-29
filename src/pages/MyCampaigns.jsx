import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { getAddress } from "../contract-config";
import { Link } from "react-router-dom";
import PageContainer from "../components/PageContainer";

const factoryAbi = [
  "function getAllCampaigns() view returns (address[])"
];

const campaignAbi = [
  "function title() view returns (string)",
  "function imageUrl() view returns (string)",
  "function deadline() view returns (uint256)",
  "function campaignOwner() view returns (address)"
];

function MyCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [userAddress, setUserAddress] = useState("");

  useEffect(() => {
    async function fetchMyCampaigns() {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const currentUser = await signer.getAddress();
        setUserAddress(currentUser);

        const factory = new ethers.Contract(getAddress("CampaignFactory"), factoryAbi, provider);
        const addresses = await factory.getAllCampaigns();

        const details = await Promise.all(
          addresses.map(async (addr) => {
            const campaign = new ethers.Contract(addr, campaignAbi, provider);
            const owner = await campaign.campaignOwner();
            if (owner.toLowerCase() !== currentUser.toLowerCase()) return null;
            const title = await campaign.title();
            const imageUrl = await campaign.imageUrl();
            const deadline = (await campaign.deadline()).toNumber() * 1000;

            return { address: addr, title, imageUrl, deadline };
          })
        );

        setCampaigns(details.filter(Boolean));
      } catch (err) {
        console.error("Error loading my campaigns:", err);
      }
    }

    fetchMyCampaigns();
  }, []);

  return (
    <PageContainer>
      <div style={{ padding: "2rem", minWidth: "600px" }}>
        <h2>My Campaigns</h2>
        {campaigns.length === 0 ? (
          <p>You haven't created any campaigns yet.</p>
        ) : (
          <div style={{ display: "grid", gap: "1.5rem" }}>
            {campaigns.map((c) => {
              const timeLeft = c.deadline - Date.now();
              const displayTime = timeLeft > 0
                ? `${Math.floor(timeLeft / (1000 * 60 * 60))}h left`
                : "Ended";

              return (
                <div key={c.address} style={cardStyle}>
                  {c.imageUrl && (
                    <img src={c.imageUrl} alt={c.title} style={imgStyle} />
                  )}
                  <h3>{c.title}</h3>
                  <p style={{ fontSize: "0.9rem", color: "gray" }}>{displayTime}</p>
                  <Link to={`/campaign/${c.address}`} style={linkStyle}>
                    View Campaign →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

const cardStyle = {
  border: "1px solid #ddd",
  borderRadius: "8px",
  padding: "1rem",
  backgroundColor: "#f9f9f9",
};

const imgStyle = {
  width: "100%",
  height: "200px",
  objectFit: "cover",
  borderRadius: "6px",
  marginBottom: "0.5rem",
};

const linkStyle = {
  color: "#081c3b",
  textDecoration: "none",
  fontWeight: "bold",
};

export default MyCampaigns;

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
  "function campaignOwner() view returns (address)",
  "function goal() view returns (uint256)",
  "function getWithdrawableAmount() view returns (uint256,uint256)"
];

function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [filter, setFilter] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const factory = new ethers.Contract(getAddress("CampaignFactory"), factoryAbi, provider);
        const addresses = await factory.getAllCampaigns();

        const details = await Promise.all(
          addresses.map(async (addr) => {
          try {
      const campaign = new ethers.Contract(addr, campaignAbi, provider);
      const title = await campaign.title();
      const imageUrl = await campaign.imageUrl();
      const deadline = (await campaign.deadline()).toNumber() * 1000;
      const owner = await campaign.campaignOwner();
      const goal = await campaign.goal();
      const [ethAvailable] = await campaign.getWithdrawableAmount();
      const goalMet = ethAvailable.gte(goal);

      return { address: addr, title, imageUrl, deadline, owner, goalMet };
    } catch (err) {
      console.warn("Skipping campaign (could not load):", addr, err.message);
      return null;
    }
          })
        );

        setCampaigns(details.filter(Boolean));

      } catch (err) {
        console.error("Error loading campaigns:", err);
      }
    }

    fetchCampaigns();
  }, []);

  const now = Date.now();
  const filtered = campaigns
    .filter((c) => (filter === "active" ? c.deadline > now : c.deadline <= now))
    .filter((c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.owner.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.deadline - b.deadline); // sort by soonest deadline first

  return (
    <PageContainer>
      <div style={{ padding: "2rem", minWidth: "600px" }}>
        <h2>Browse Campaigns</h2>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <button
            onClick={() => setFilter("active")}
            style={filter === "active" ? activeTabStyle : tabStyle}
          >
            Active
          </button>
          <button
            onClick={() => setFilter("ended")}
            style={filter === "ended" ? activeTabStyle : tabStyle}
          >
            Ended
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search by title or creator"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: "0.5rem", width: "100%", marginBottom: "1.5rem" }}
        />

        {/* Cards */}
        {filtered.length === 0 ? (
          <p>No campaigns found.</p>
        ) : (
          <div style={{ display: "grid", gap: "1.5rem" }}>
            {filtered.map((c) => {
              const timeLeft = c.deadline - Date.now();
              const displayTime = timeLeft > 0
                ? `${Math.floor(timeLeft / (1000 * 60 * 60))}h left`
                : "Ended";
              const isEndingSoon = timeLeft > 0 && timeLeft < 24 * 60 * 60 * 1000;

              return (
                <div key={c.address} style={{
                  ...cardStyle,
                  border: isEndingSoon ? "2px solid #f39c12" : cardStyle.border
                }}>
                  {c.imageUrl && (
                    <img src={c.imageUrl} alt={c.title} style={imgStyle} />
                  )}
                  <h3>{c.title}</h3>
                  {c.goalMet && (
                  <span style={{
                  backgroundColor: "#2ecc71",
                  color: "white",
                  fontSize: "0.7rem",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "5px",
                  marginBottom: "0.5rem",
                  display: "inline-block"
                }}>
                  🎯 Goal Met
                </span>
              )}
                  {isEndingSoon && <span style={badgeStyle}>⏳ Ending Soon</span>}
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                    <span style={tokenBadge}>ETH</span>
                    <span style={tokenBadge}>USDC</span>
                  </div>
                  <p style={{ fontSize: "0.9rem", color: "gray" }}>
                    {displayTime}
                  </p>
                  <p style={{ fontSize: "0.8rem" }}>
                    Owner: {c.owner.slice(0, 6)}...{c.owner.slice(-4)}
                  </p>
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

const tabStyle = {
  padding: "0.5rem 1rem",
  border: "1px solid #ccc",
  borderRadius: "5px",
  background: "white",
  cursor: "pointer",
};

const activeTabStyle = {
  ...tabStyle,
  background: "#081c3b",
  color: "white",
};

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

const tokenBadge = {
  backgroundColor: "#081c3b",
  color: "white",
  fontSize: "0.7rem",
  padding: "0.2rem 0.5rem",
  borderRadius: "5px",
};

const badgeStyle = {
  display: "inline-block",
  backgroundColor: "#f39c12",
  color: "white",
  fontSize: "0.75rem",
  padding: "0.25rem 0.5rem",
  borderRadius: "4px",
  marginBottom: "0.5rem",
};

export default Campaigns;


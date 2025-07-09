import ImageUploader from "../components/ImageUploader";
import { useState } from "react";
import { ethers } from "ethers";
import { getAddress } from "../contract-config";
import PageContainer from "../components/PageContainer";


const factoryAbi = [
  "function createCampaign(uint256,uint256,string,string,string)",
  "function getAllCampaigns() view returns (address[])",
];

function CreateCampaign() {
  const [goalEth, setGoalEth] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState("");

  async function handleCreate() {
    if (!window.ethereum) {
      alert("Please install MetaMask.");
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();

      const factoryAddress = getAddress("CampaignFactory");
      const factory = new ethers.Contract(factoryAddress, factoryAbi, signer);

      const goalWei = ethers.utils.parseEther(goalEth);
      const duration = parseInt(durationDays);

      const tx = await factory.createCampaign(goalWei, duration, title, description, imageUrl);
      setStatus("Waiting for confirmation...");
      const receipt = await tx.wait();

      const all = await factory.getAllCampaigns();
      const newAddress = all[all.length - 1];
      setStatus(`Campaign created at: ${newAddress}`);
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
    }
  }

  return (
    <PageContainer>
      <div style={{ minWidth: "600px", margin: "0 auto" }}>
        <h2>Create a Campaign</h2>

        <label>Goal (ETH):</label>
        <input
          type="text"
          value={goalEth}
          onChange={(e) => setGoalEth(e.target.value)}
          style={inputStyle}
        />

        <label>Duration (in days):</label>
        <input
          type="text"
          value={durationDays}
          onChange={(e) => setDurationDays(e.target.value)}
          style={inputStyle}
        />

        <label>Campaign Title:</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle}
        />

        <label>Description:</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ ...inputStyle, height: "100px" }}
        />

       {/* Image Upload Section */}
<ImageUploader onUpload={(url) => setImageUrl(url)} />

{/* Optional manual URL input (can hide or make readOnly) */}
<input
  type="text"
  value={imageUrl}
  readOnly
  style={{ display: "none" }}
/>

{/* Preview of uploaded image */}
{imageUrl && (
  <div style={{ marginTop: "1rem" }}>
    <p><strong>Image Preview:</strong></p>
    <img
      src={imageUrl}
      alt="Campaign Preview"
      style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "8px" }}
    />
  </div>
)}

        <button onClick={handleCreate} style={buttonStyle}>
          Create Campaign
        </button>
        <p>{status}</p>
      </div>
    </PageContainer>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  margin: "0.5rem 0 1rem",
  padding: "0.5rem",
  fontSize: "1rem",
};

const buttonStyle = {
  padding: "0.75rem 1.5rem",
  fontSize: "1rem",
  backgroundColor: "#081c3b",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
};

export default CreateCampaign;


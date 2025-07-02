import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ethers } from "ethers";

function NavBar() {
  const OWNER_ADDRESS = import.meta.env.VITE_OWNER_ADDRESS;
  const [connectedWallet, setConnectedWallet] = useState("");

  useEffect(() => {
    async function checkWallet() {
      if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        setConnectedWallet(address);
      }
    }
    checkWallet();
  }, []);
  return (
    <nav style={{ background: "#081c3b", color: "white" }}>
      <div style={{
        maxWidth: "900px",       // ✅ limit width
        margin: "0 auto",         // ✅ center horizontally
        padding: "1rem 2rem",     // ✅ add spacing inside
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>
          <Link to="/" style={{ color: "white", textDecoration: "none" }}>
            FreeFlow
          </Link>
        </h1>
        <div style={{ display: "flex", gap: "1.5rem", fontSize: "1rem" }}>
          {connectedWallet.toLowerCase() === OWNER_ADDRESS.toLowerCase() && (
  <Link to="/admin" style={{ color: "white", textDecoration: "none" }}>Admin</Link>
)}
          <Link to="/about" style={{ color: "white", textDecoration: "none" }}>About</Link>
          <Link to="/campaigns" style={{ color: "white", textDecoration: "none" }}>Browse</Link>
          <Link to="/create" style={{ color: "white", textDecoration: "none" }}>Start a Campaign</Link>
          {connectedWallet && (
          <Link to="/my-campaigns" style={{ color: "white", textDecoration: "none" }}>
            My Campaigns
          </Link>
)}
          <Link to="/stake" style={{ color: "white", textDecoration: "none" }}>Stake/Vouch</Link>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;



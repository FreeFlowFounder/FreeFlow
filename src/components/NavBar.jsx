import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ethers } from "ethers";

function NavBar() {
  const OWNER_ADDRESS = import.meta.env.VITE_OWNER_ADDRESS;
  const [connectedWallet, setConnectedWallet] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

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
    <nav className="navbar">
      <div className="nav-container">
        <h1 className="logo">
          <Link to="/">FreeFlow</Link>
        </h1>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          ☰
        </button>
        <div className={`nav-links ${menuOpen ? "open" : ""}`}>
          {connectedWallet.toLowerCase() === OWNER_ADDRESS?.toLowerCase() && (
            <Link to="/admin">Admin</Link>
          )}
          <Link to="/about">About</Link>
          <Link to="/campaigns">Browse</Link>
          <Link to="/create">Start a Campaign</Link>
          {connectedWallet && <Link to="/my-campaigns">My Campaigns</Link>}
          <Link to="/stake">Stake/Vouch</Link>
        </div>
      </div>
    </nav>
  );
}

export default NavBar;




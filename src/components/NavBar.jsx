import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Bars3Icon } from "@heroicons/react/24/solid";

function NavBar() {
  const OWNER_ADDRESS = import.meta.env.VITE_OWNER_ADDRESS || "";
  const EXPECTED_CHAIN_ID = import.meta.env.VITE_NETWORK === "testnet" ? 84532 : 8453;

  const [connectedWallet, setConnectedWallet] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [chainId, setChainId] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("walletAddress");
    if (saved) setConnectedWallet(saved);

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setConnectedWallet(accounts[0]);
          localStorage.setItem("walletAddress", accounts[0]);
        } else {
          disconnectWallet();
        }
      });

      window.ethereum.on("chainChanged", () => {
        checkChain();
      });

      checkChain();
    }
  }, []);

  const checkChain = async () => {
    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();
      setChainId(network.chainId);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const shortenAddress = (addr) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  const connectMetaMask = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setConnectedWallet(accounts[0]);
        localStorage.setItem("walletAddress", accounts[0]);
        showToast("Connected with MetaMask");
        checkChain();
      } catch (err) {
        console.error("User rejected MetaMask connection");
      }
    } else {
      alert("MetaMask not detected");
    }
  };

  const disconnectWallet = () => {
    setConnectedWallet("");
    localStorage.removeItem("walletAddress");
    showToast("Disconnected");
  };

  const navLinks = (
    <>
      {connectedWallet &&
        OWNER_ADDRESS &&
        connectedWallet.toLowerCase() === OWNER_ADDRESS.toLowerCase() && (
          <Link to="/admin" className="!text-white no-underline hover:underline visited:!text-white active:!text-white" onClick={() => setDrawerOpen(false)}>
            Admin
          </Link>
        )}
      <Link to="/about" className="!text-white no-underline hover:underline visited:!text-white active:!text-white" onClick={() => setDrawerOpen(false)}>About</Link>
      <Link to="/campaigns" className="!text-white no-underline hover:underline visited:!text-white active:!text-white" onClick={() => setDrawerOpen(false)}>Browse</Link>
      <Link to="/create" className="!text-white no-underline hover:underline visited:!text-white active:!text-white" onClick={() => setDrawerOpen(false)}>Start a Campaign</Link>
      {connectedWallet && (
        <Link to="/my-campaigns" className="!text-white no-underline hover:underline visited:!text-white active:!text-white" onClick={() => setDrawerOpen(false)}>
          My Campaigns
        </Link>
      )}
      <Link to="/stake" className="!text-white no-underline hover:underline visited:!text-white active:!text-white" onClick={() => setDrawerOpen(false)}>Stake/Vouch</Link>
    </>
  );

  return (
    <nav className="bg-[#081c3b] text-white relative z-50">
      <div className="max-w-[900px] mx-auto px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">
          <Link to="/" className="!text-white no-underline hover:underline visited:!text-white active:!text-white">FreeFlow</Link>
        </h1>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6 text-white">
          <div className="flex gap-6 [&_a]:!text-white [&_a:visited]:!text-white [&_a:active]:!text-white [&_a]:no-underline [&_a:hover]:underline">
            {navLinks}
          </div>

          {connectedWallet ? (
            <div className="flex items-center gap-2 text-base font-semibold text-white border border-white rounded px-3 py-1 bg-[#102d5c]">
              <span className="text-white font-mono tracking-tight">🦊 {shortenAddress(connectedWallet)}</span>
              <button onClick={disconnectWallet} className="text-xs text-red-400 ml-2 hover:underline">
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connectMetaMask}
              className="bg-white text-[#081c3b] px-3 py-1 rounded font-medium text-sm hover:bg-gray-200"
            >
              Connect Wallet
            </button>
          )}
        </div>

        {/* Hamburger icon (mobile only) */}
        <div className="block md:hidden">
          <Bars3Icon
            aria-label="Open menu"
            className="w-6 h-6 text-white cursor-pointer"
            onClick={() => setDrawerOpen(true)}
          />
        </div>
      </div>

      {/* Mobile drawer backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile drawer panel */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-[#081c3b] text-white z-50 p-6 transform transition-transform duration-300 ease-in-out ${
        drawerOpen ? "translate-x-0" : "-translate-x-full"
      } flex flex-col gap-4 md:hidden`}>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-white">Menu</h2>
          <button className="text-2xl text-white" onClick={() => setDrawerOpen(false)}>✕</button>
        </div>

        <div className="flex flex-col gap-4 [&_a]:!text-white [&_a:visited]:!text-white [&_a:active]:!text-white [&_a]:no-underline [&_a:hover]:underline">
          {navLinks}
        </div>

        {connectedWallet ? (
          <div className="flex flex-col gap-1 text-base font-semibold text-white border border-white rounded px-3 py-2 mt-4 bg-[#102d5c]">
            <span className="text-white font-mono tracking-tight">🦊 {shortenAddress(connectedWallet)}</span>
            <button onClick={disconnectWallet} className="block text-xs text-red-400 mt-1 hover:underline">
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              connectMetaMask();
              setDrawerOpen(false);
            }}
            className="bg-white text-[#081c3b] px-3 py-2 rounded font-medium text-sm mt-4 hover:bg-gray-200"
          >
            Connect Wallet
          </button>
        )}
      </div>

      {/* Network warning */}
      {connectedWallet && chainId && chainId !== EXPECTED_CHAIN_ID && (
        <div className="bg-red-600 text-white text-sm px-4 py-2 text-center">
          ⚠ You're connected to the wrong network. Please switch to {EXPECTED_CHAIN_ID === 8453 ? "Base Mainnet" : "Base Sepolia"}.
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-black text-white px-4 py-2 rounded shadow z-50">
          {toast}
        </div>
      )}
    </nav>
  );
}

export default NavBar;










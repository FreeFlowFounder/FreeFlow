import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import FreeFlowOwnerPanel from "./pages/FreeFlowOwnerPanel";
import Home from "./pages/Home";
import About from "./pages/About";
import CreateCampaign from "./pages/CreateCampaign";
import Campaigns from "./pages/Campaigns";
import CampaignDetail from "./pages/CampaignDetail";
import ValidatorPanel from "./pages/ValidatorPanel";
import MyCampaigns from "./pages/MyCampaigns";
import NavBar from "./components/NavBar";

function App() {
  return (
    <Router>
      <NavBar /> {/* ✅ Full-width nav outside the page wrapper */}

      <div
        style={{
          maxWidth: "900px",         // ✅ page content is centered
          width: "100%",
          minHeight: "100vh",
          backgroundColor: "white",
          margin: "0 auto",
          padding: "2rem 1rem",
        }}
      >
        <Routes>
          <Route path="/admin" element={<FreeFlowOwnerPanel />} />
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/create" element={<CreateCampaign />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaign/:address" element={<CampaignDetail />} />
          <Route path="/stake" element={<ValidatorPanel />} />
          <Route path="/my-campaigns" element={<MyCampaigns />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;








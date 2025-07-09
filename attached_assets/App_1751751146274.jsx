import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import './App.css';
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
  <div className="app-container">
    <NavBar />
    <div className="content">
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
  </div>
</Router>
  );
}

export default App;







import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletProvider } from "@/hooks/use-wallet";
import { Navbar } from "@/components/navbar";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Campaigns from "@/pages/campaigns";
import CreateCampaign from "@/pages/create-campaign";
import CampaignDetail from "@/pages/campaign-detail";
import MyCampaigns from "@/pages/my-campaigns";
import Stake from "@/pages/stake";
import About from "@/pages/about";
import FAQ from "@/pages/faq";
import HowItWorks from "@/pages/how-it-works";
import Admin from "@/pages/admin";
import TestFlow from "@/pages/test-flow";
import ContractDebug from "@/pages/contract-debug";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/campaigns" component={Campaigns} />
      <Route path="/create" component={CreateCampaign} />
      <Route path="/campaign/:id" component={CampaignDetail} />
      <Route path="/my-campaigns" component={MyCampaigns} />
      <Route path="/stake" component={Stake} />
      <Route path="/about" component={About} />
      <Route path="/faq" component={FAQ} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/admin" component={Admin} />
      <Route path="/test-flow" component={TestFlow} />
      <Route path="/debug" component={ContractDebug} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <Router />
            <Toaster />
          </div>
        </TooltipProvider>
      </WalletProvider>
    </QueryClientProvider>
  );
}

export default App;

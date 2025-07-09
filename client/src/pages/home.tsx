import { Link } from 'wouter';
import { Search, Plus, Shield, Coins, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PageContainer } from '@/components/page-container';
import FreeFlowLogo from '@assets/FreeFlow_Logo_1751751541297.png';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-white py-16 sm:py-24">
        <PageContainer>
          <div className="text-center">
            {/* Logo */}
            <div className="flex justify-center mb-12">
              <img 
                src={FreeFlowLogo} 
                alt="FreeFlow Logo" 
                className="h-48 sm:h-56 lg:h-64 w-auto"
              />
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Borderless Giving.
              <span className="text-freeflow-900 block">Built on Crypto.</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              FreeFlow is a censorship-resistant crowdfunding platform for principled, freedom-focused causes. 
              Donate across chains. Stake FLW. Fund what matters.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/campaigns">
                <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-freeflow-900 hover:bg-freeflow-800 text-white px-8 py-4 text-lg shadow-lg transform hover:scale-105 transition-all duration-200 h-11 rounded-md cursor-pointer">
                  <Search className="w-5 h-5 mr-2" />
                  Browse Campaigns
                </span>
              </Link>
              <Link href="/create">
                <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border-2 border-freeflow-900 text-freeflow-900 hover:bg-freeflow-900 hover:text-white px-8 py-4 text-lg transform hover:scale-105 transition-all duration-200 h-11 rounded-md cursor-pointer bg-background">
                  <Plus className="w-5 h-5 mr-2" />
                  Start a Campaign
                </span>
              </Link>
            </div>
          </div>
        </PageContainer>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <PageContainer>
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose FreeFlow?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Built for freedom-first fundraising with cutting-edge blockchain technology
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-freeflow-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="text-freeflow-900 w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Censorship Resistant</h3>
                <p className="text-gray-600">No central authority can shut down your campaign or freeze your funds</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-freeflow-100 rounded-lg flex items-center justify-center mb-4">
                  <Coins className="text-freeflow-900 w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Multi-Chain Support</h3>
                <p className="text-gray-600">Accept donations in ETH, USDC, and FLW across multiple blockchains</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-freeflow-100 rounded-lg flex items-center justify-center mb-4">
                  <Eye className="text-freeflow-900 w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Transparent</h3>
                <p className="text-gray-600">All transactions and campaign data are stored on-chain for full transparency</p>
              </CardContent>
            </Card>
          </div>
        </PageContainer>
      </section>

      {/* Footer */}
      <footer className="bg-freeflow-900 text-white py-12">
        <PageContainer>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-4">FreeFlow</h3>
              <p className="text-gray-300 text-sm">
                Censorship-resistant crowdfunding for freedom-focused causes.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><Link href="/campaigns"><span className="hover:text-white transition-colors">Browse Campaigns</span></Link></li>
                <li><Link href="/create"><span className="hover:text-white transition-colors">Create Campaign</span></Link></li>
                <li><Link href="/stake"><span className="hover:text-white transition-colors">Stake FLW</span></Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><Link href="/about"><span className="hover:text-white transition-colors">About</span></Link></li>
                <li><Link href="/how-it-works"><span className="hover:text-white transition-colors">How it Works</span></Link></li>
                <li><Link href="/faq"><span className="hover:text-white transition-colors">FAQ</span></Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Community</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><a href="#" className="hover:text-white transition-colors">Discord</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-white transition-colors">GitHub</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-300">
            <p>&copy; 2024 FreeFlow. Built for freedom.</p>
          </div>
        </PageContainer>
      </footer>
    </div>
  );
}

import { PageContainer } from '@/components/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Heart, Shield, Users, Globe, Zap, Target } from 'lucide-react';

export default function About() {
  return (
    <PageContainer>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            About FreeFlow
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            The first comprehensive crowdfunding platform on Base chain, built for censorship-resistance 
            and empowering principled causes and freedom-focused initiatives.
          </p>
        </div>

        {/* Mission Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Target className="w-6 h-6 mr-3 text-freeflow-600" />
              Our Mission
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              FreeFlow was created to solve a critical problem: the increasing censorship and deplatforming 
              of legitimate causes and individuals who challenge mainstream narratives. Traditional crowdfunding 
              platforms have become gatekeepers, deciding which causes deserve funding based on political 
              alignment rather than merit.
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              We believe in the fundamental right to free speech and the power of decentralized technology 
              to preserve these freedoms. By building on blockchain technology, we create an uncensorable 
              platform where principled causes can receive the support they deserve.
            </p>
          </CardContent>
        </Card>

        {/* Core Values */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2 text-freeflow-600" />
                Censorship Resistance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Built on blockchain technology to ensure no central authority can shut down or censor campaigns.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2 text-freeflow-600" />
                Community Governed
                <Badge variant="secondary" className="ml-2 text-xs">Coming Soon</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Validators and token holders will participate in governance, ensuring the platform serves its users. 
                Staking and DAO features launching soon.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="w-5 h-5 mr-2 text-freeflow-600" />
                Global Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                Available worldwide without geographical restrictions or traditional banking requirements.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Zap className="w-6 h-6 mr-3 text-freeflow-600" />
              How FreeFlow Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">For Campaign Creators</h3>
                <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                  <li className="flex items-start">
                    <span className="text-freeflow-600 mr-2">1.</span>
                    Connect your Web3 wallet
                  </li>
                  <li className="flex items-start">
                    <span className="text-freeflow-600 mr-2">2.</span>
                    Create your campaign with goals and description
                  </li>
                  <li className="flex items-start">
                    <span className="text-freeflow-600 mr-2">3.</span>
                    Your campaign is deployed as a smart contract
                  </li>
                  <li className="flex items-start">
                    <span className="text-freeflow-600 mr-2">4.</span>
                    Receive donations directly to your wallet
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">For Supporters</h3>
                <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                  <li className="flex items-start">
                    <span className="text-freeflow-600 mr-2">1.</span>
                    Browse campaigns by category or search
                  </li>
                  <li className="flex items-start">
                    <span className="text-freeflow-600 mr-2">2.</span>
                    Connect your wallet (MetaMask, WalletConnect, etc.)
                  </li>
                  <li className="flex items-start">
                    <span className="text-freeflow-600 mr-2">3.</span>
                    Donate in ETH, USDC, or other supported tokens
                  </li>
                  <li className="flex items-start">
                    <span className="text-freeflow-600 mr-2">4.</span>
                    Track your donations and campaign progress
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technology */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Heart className="w-6 h-6 mr-3 text-freeflow-600" />
              Built on Proven Technology
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-freeflow-50 dark:bg-freeflow-900/20 rounded-lg">
                <Badge variant="secondary" className="mb-2">Blockchain</Badge>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Ethereum & Base Chain
                </p>
              </div>
              <div className="text-center p-4 bg-freeflow-50 dark:bg-freeflow-900/20 rounded-lg">
                <Badge variant="secondary" className="mb-2">Smart Contracts</Badge>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Solidity & OpenZeppelin
                </p>
              </div>
              <div className="text-center p-4 bg-freeflow-50 dark:bg-freeflow-900/20 rounded-lg">
                <Badge variant="secondary" className="mb-2">Storage</Badge>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  IPFS & Decentralized
                </p>
              </div>
              <div className="text-center p-4 bg-freeflow-50 dark:bg-freeflow-900/20 rounded-lg">
                <Badge variant="secondary" className="mb-2">Frontend</Badge>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  React & Web3
                </p>
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Every component of FreeFlow is built with decentralization in mind. Smart contracts ensure 
              transparency and immutability, IPFS provides censorship-resistant storage, and our validator 
              network maintains platform integrity without central control.
            </p>
          </CardContent>
        </Card>

        {/* Team Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Our Commitment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              FreeFlow is more than a platform—it's a movement toward preserving fundamental freedoms in 
              the digital age. We're committed to maintaining this platform as a neutral, uncensorable 
              space where principled causes can thrive, regardless of political climate or mainstream opinion.
            </p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
              Join us in building a more open, free, and decentralized future for crowdfunding.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
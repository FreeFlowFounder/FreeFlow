import { PageContainer } from '@/components/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Wallet, 
  FileText, 
  Shield, 
  Coins, 
  Users, 
  TrendingUp, 
  Globe,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Heart
} from 'lucide-react';
import { Link } from 'wouter';

export default function HowItWorks() {
  return (
    <PageContainer>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            How FreeFlow Works
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            A simple, secure, and censorship-resistant way to fund causes that matter. 
            Built on blockchain technology for maximum transparency and freedom.
          </p>
        </div>

        {/* Quick Overview */}
        <div className="grid md:grid-cols-2 gap-8">
          <Card className="bg-gradient-to-br from-freeflow-50 to-freeflow-100 dark:from-freeflow-900/20 dark:to-freeflow-800/20 border-freeflow-200 dark:border-freeflow-700">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <Users className="w-6 h-6 mr-3 text-freeflow-600" />
                For Campaign Creators
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Launch uncensorable campaigns for your cause. No middlemen, no restrictions, 
                just direct funding from supporters to your wallet.
              </p>
              <Link href="/create-campaign">
                <Button className="bg-freeflow-600 hover:bg-freeflow-700 text-white">
                  Start Your Campaign
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <Heart className="w-6 h-6 mr-3 text-blue-600" />
                For Supporters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Support causes you believe in with cryptocurrency. Your donations go directly 
                to creators with full transparency and security.
              </p>
              <Link href="/campaigns">
                <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                  Browse Campaigns
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Step-by-Step Process */}
        <div className="space-y-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
            Getting Started is Simple
          </h2>

          {/* For Campaign Creators */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <FileText className="w-6 h-6 mr-3 text-freeflow-600" />
                Creating Your Campaign
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-freeflow-100 dark:bg-freeflow-900/30 rounded-full flex items-center justify-center mx-auto">
                    <Wallet className="w-8 h-8 text-freeflow-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">1. Connect Wallet</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Connect your MetaMask, WalletConnect, or Coinbase Wallet to get started.
                    </p>
                  </div>
                </div>

                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-freeflow-100 dark:bg-freeflow-900/30 rounded-full flex items-center justify-center mx-auto">
                    <FileText className="w-8 h-8 text-freeflow-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">2. Create Campaign</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Fill out your campaign details, set your funding goal, and upload an image.
                    </p>
                  </div>
                </div>

                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-freeflow-100 dark:bg-freeflow-900/30 rounded-full flex items-center justify-center mx-auto">
                    <Shield className="w-8 h-8 text-freeflow-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">3. Deploy Contract</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Your campaign becomes a smart contract on the blockchain—permanent and uncensorable.
                    </p>
                  </div>
                </div>

                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-freeflow-100 dark:bg-freeflow-900/30 rounded-full flex items-center justify-center mx-auto">
                    <TrendingUp className="w-8 h-8 text-freeflow-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">4. Receive Funds</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Donations flow directly to your wallet. Withdraw anytime, no restrictions.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* For Supporters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <Coins className="w-6 h-6 mr-3 text-blue-600" />
                Supporting Campaigns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto">
                    <Globe className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">1. Browse Campaigns</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Explore active campaigns and find causes that align with your values.
                    </p>
                  </div>
                </div>

                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto">
                    <Wallet className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">2. Connect Wallet</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Connect your Web3 wallet and ensure you have ETH or USDC to donate.
                    </p>
                  </div>
                </div>

                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto">
                    <Coins className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">3. Make Donation</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Choose your amount and token type. Your donation goes directly to the creator.
                    </p>
                  </div>
                </div>

                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">4. Track Impact</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Follow campaign progress and see how your contribution makes a difference.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Key Features */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
            Why Choose FreeFlow?
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-green-200 dark:border-green-700">
              <CardHeader>
                <CardTitle className="flex items-center text-green-700 dark:text-green-400">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Censorship Resistant
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  Once deployed, your campaign cannot be shut down or censored by any authority. 
                  It lives permanently on the blockchain.
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 dark:border-blue-700">
              <CardHeader>
                <CardTitle className="flex items-center text-blue-700 dark:text-blue-400">
                  <Shield className="w-5 h-5 mr-2" />
                  Transparent & Secure
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  All transactions are recorded on the blockchain. Smart contracts ensure 
                  funds are secure and only accessible by campaign creators.
                </p>
              </CardContent>
            </Card>

            <Card className="border-purple-200 dark:border-purple-700">
              <CardHeader>
                <CardTitle className="flex items-center text-purple-700 dark:text-purple-400">
                  <Globe className="w-5 h-5 mr-2" />
                  Global Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  Available worldwide without geographical restrictions. No need for 
                  traditional banking—just a cryptocurrency wallet.
                </p>
              </CardContent>
            </Card>

            <Card className="border-orange-200 dark:border-orange-700">
              <CardHeader>
                <CardTitle className="flex items-center text-orange-700 dark:text-orange-400">
                  <Coins className="w-5 h-5 mr-2" />
                  Direct Funding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  Donations go directly from supporters to creators. No payment processors 
                  or middlemen that can freeze or block transactions.
                </p>
              </CardContent>
            </Card>

            <Card className="border-teal-200 dark:border-teal-700">
              <CardHeader>
                <CardTitle className="flex items-center text-teal-700 dark:text-teal-400">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Real-Time Updates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  Campaign progress updates in real-time as donations are made. 
                  Full transparency for all participants.
                </p>
              </CardContent>
            </Card>

            <Card className="border-red-200 dark:border-red-700">
              <CardHeader>
                <CardTitle className="flex items-center text-red-700 dark:text-red-400">
                  <Users className="w-5 h-5 mr-2" />
                  Community Driven
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400">
                  Platform governance by validators and token holders. The community 
                  decides the future direction of FreeFlow.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Important Notes */}
        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700">
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-800 dark:text-yellow-400">
              <AlertCircle className="w-5 h-5 mr-2" />
              Important Things to Know
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Gas Fees</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Ethereum network fees apply to all transactions. These go to network validators, not FreeFlow.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Wallet Security</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Keep your wallet secure and never share your private keys. Only you control your funds.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Irreversible Transactions</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Blockchain transactions cannot be reversed. Always double-check addresses and amounts.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Campaign Responsibility</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Campaign creators are responsible for their own campaigns and use of funds.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <Card className="bg-gradient-to-r from-freeflow-600 to-freeflow-700 text-white">
          <CardContent className="text-center py-8">
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-freeflow-100 mb-6 max-w-2xl mx-auto">
              Join the censorship-resistant funding revolution. Whether you're creating a campaign 
              or supporting causes you believe in, FreeFlow makes it simple and secure.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/create-campaign">
                <Button size="lg" className="bg-white text-freeflow-600 hover:bg-freeflow-50">
                  Create Your Campaign
                </Button>
              </Link>
              <Link href="/campaigns">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-freeflow-600">
                  Browse Campaigns
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
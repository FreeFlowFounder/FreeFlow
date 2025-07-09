import { PageContainer } from '@/components/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, Shield, Coins, Users, Zap, Lock } from 'lucide-react';

export default function FAQ() {
  return (
    <PageContainer>
      <div className="space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Everything you need to know about FreeFlow's censorship-resistant crowdfunding platform.
          </p>
        </div>

        {/* FAQ Categories */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card className="text-center p-4">
            <Shield className="w-8 h-8 mx-auto mb-2 text-freeflow-600" />
            <Badge variant="secondary">Security & Privacy</Badge>
          </Card>
          <Card className="text-center p-4">
            <Coins className="w-8 h-8 mx-auto mb-2 text-freeflow-600" />
            <Badge variant="secondary">Payments & Tokens</Badge>
          </Card>
          <Card className="text-center p-4">
            <Users className="w-8 h-8 mx-auto mb-2 text-freeflow-600" />
            <Badge variant="secondary">Platform Usage</Badge>
          </Card>
        </div>

        {/* General Questions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <HelpCircle className="w-6 h-6 mr-3 text-freeflow-600" />
              General Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="what-is-freeflow">
                <AccordionTrigger>What is FreeFlow?</AccordionTrigger>
                <AccordionContent>
                  FreeFlow is a decentralized crowdfunding platform built on blockchain technology. 
                  It's designed to be censorship-resistant, meaning no central authority can shut down 
                  or censor campaigns. We focus on supporting principled, freedom-focused causes that 
                  might face restrictions on traditional platforms.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="how-different">
                <AccordionTrigger>How is FreeFlow different from traditional crowdfunding?</AccordionTrigger>
                <AccordionContent>
                  Unlike traditional platforms, FreeFlow operates on blockchain technology, making it 
                  impossible for any single entity to censor or shut down campaigns. Funds are held 
                  in smart contracts, ensuring transparency and security. There are no payment processors 
                  or banks that can freeze accounts, and the platform is accessible globally without 
                  geographical restrictions.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="who-can-use">
                <AccordionTrigger>Who can use FreeFlow?</AccordionTrigger>
                <AccordionContent>
                  Anyone with a Web3 wallet can use FreeFlow. This includes individuals, organizations, 
                  activists, journalists, researchers, and any group or person working on causes that 
                  promote freedom, truth, and principled positions. The platform is designed to be 
                  accessible to users worldwide, regardless of their location or traditional banking status.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Technical Questions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Zap className="w-6 h-6 mr-3 text-freeflow-600" />
              Technical Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="what-wallet">
                <AccordionTrigger>What wallets are supported?</AccordionTrigger>
                <AccordionContent>
                  FreeFlow supports all major Web3 wallets including MetaMask, WalletConnect, 
                  Coinbase Wallet, and any wallet that supports the Ethereum network. You'll need 
                  to have one of these wallets installed and funded with cryptocurrency to participate.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="what-tokens">
                <AccordionTrigger>What tokens can I use to donate?</AccordionTrigger>
                <AccordionContent>
                  Currently, FreeFlow supports donations in ETH (Ethereum) and USDC (USD Coin). 
                  More tokens will be added in the future. All donations are processed through 
                  smart contracts on the Ethereum blockchain, ensuring transparency and security.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="gas-fees">
                <AccordionTrigger>Are there gas fees?</AccordionTrigger>
                <AccordionContent>
                  Yes, FreeFlow operates on Base, an Ethereum Layer 2 chain that offers significantly 
                  lower gas fees than Ethereum mainnet. Transaction costs are typically under $0.01, 
                  making donations and campaign creation very affordable. These fees go to the network 
                  validators, not to FreeFlow, and help secure the blockchain network.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="smart-contracts">
                <AccordionTrigger>Are the smart contracts audited?</AccordionTrigger>
                <AccordionContent>
                  Our smart contracts follow industry best practices and use proven patterns 
                  like OpenZeppelin libraries. Each campaign is deployed as an individual smart 
                  contract, ensuring isolation and security. Professional audits are planned and 
                  will be funded through FreeFlow's inaugural campaign at launch. All contract 
                  addresses are publicly verifiable on the blockchain for transparency.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Campaign Questions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Users className="w-6 h-6 mr-3 text-freeflow-600" />
              Campaign Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="create-campaign">
                <AccordionTrigger>How do I create a campaign?</AccordionTrigger>
                <AccordionContent>
                  Connect your Web3 wallet, click "Create Campaign," fill out the form with your 
                  campaign details (title, description, funding goal, duration), upload an image, 
                  and submit. Your campaign will be deployed as a smart contract on the blockchain, 
                  making it permanently accessible and uncensorable.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="campaign-fees">
                <AccordionTrigger>Are there platform fees?</AccordionTrigger>
                <AccordionContent>
                  FreeFlow charges a small platform fee to maintain the network and support 
                  development. This fee is transparent and built into the smart contract. 
                  The exact percentage will be clearly displayed before you confirm any transaction.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="withdraw-funds">
                <AccordionTrigger>How do I withdraw funds from my campaign?</AccordionTrigger>
                <AccordionContent>
                  Only the campaign creator can withdraw funds. You can withdraw funds at any time 
                  by visiting your campaign page and clicking "Withdraw." Funds are sent directly 
                  to your wallet address. All withdrawals are recorded on the blockchain for transparency.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="campaign-duration">
                <AccordionTrigger>How long can my campaign run?</AccordionTrigger>
                <AccordionContent>
                  You can set your campaign duration when creating it. Campaigns can run from 
                  1 day to 365 days. After the campaign ends, you can still withdraw any funds 
                  raised, but no new donations will be accepted.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Security Questions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Lock className="w-6 h-6 mr-3 text-freeflow-600" />
              Security & Privacy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="funds-safe">
                <AccordionTrigger>Are my funds safe?</AccordionTrigger>
                <AccordionContent>
                  Yes, funds are held in smart contracts on the Ethereum blockchain, which is 
                  one of the most secure and battle-tested blockchain networks. Only the campaign 
                  creator can withdraw funds, and all transactions are publicly verifiable. 
                  There's no central authority that can freeze or seize funds.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="privacy">
                <AccordionTrigger>Is my privacy protected?</AccordionTrigger>
                <AccordionContent>
                  FreeFlow respects user privacy. We don't collect personal information beyond 
                  what's necessary for the platform to function. Your wallet address is public 
                  on the blockchain (as with all cryptocurrency transactions), but this doesn't 
                  reveal your identity unless you choose to share it.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="censorship-resistance">
                <AccordionTrigger>How is censorship resistance guaranteed?</AccordionTrigger>
                <AccordionContent>
                  Once a campaign is deployed to the blockchain, it becomes permanent and 
                  uncensorable. No government, corporation, or individual can shut it down. 
                  The frontend interface is also designed to be decentralized, with multiple 
                  access points to ensure continued availability.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="backup-access">
                <AccordionTrigger>What if the website goes down?</AccordionTrigger>
                <AccordionContent>
                  Since campaigns are stored on the blockchain, they remain accessible even if 
                  the main website experiences issues. Users can interact with campaigns directly 
                  through blockchain explorers or alternative frontends. The decentralized nature 
                  ensures no single point of failure.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Support */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Still Have Questions?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              If you couldn't find the answer to your question, we're here to help. 
              Reach out directly for support or check our development progress.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href="mailto:founder@getFreeFlow.org" className="no-underline">
                <Badge variant="outline" className="text-freeflow-600 border-freeflow-600 hover:bg-freeflow-50 cursor-pointer">
                  Email Support
                </Badge>
              </a>
              <a href="https://github.com/FreeFlowFounder/FreeFlow" target="_blank" rel="noopener noreferrer" className="no-underline">
                <Badge variant="outline" className="text-freeflow-600 border-freeflow-600 hover:bg-freeflow-50 cursor-pointer">
                  GitHub
                </Badge>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
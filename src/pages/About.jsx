import React from "react";
import PageContainer from "../components/PageContainer";

const About = () => {
  return (
    <PageContainer>
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">About FreeFlow</h1>
        <p className="mb-4">
          <strong>FreeFlow</strong> is a censorship-resistant crowdfunding platform built
          for freedom-first, ideological, and faith-based fundraising — the kinds of causes
          that are often suppressed or deplatformed by mainstream platforms.
        </p>
        <p className="mb-6">
          We enable anyone to raise funds or donate using crypto, with no reliance on banks
          or Big Tech gatekeepers.
        </p>

        <h2 className="text-2xl font-semibold mb-4">Why FreeFlow?</h2>
        <ul className="list-disc pl-6 mb-6 space-y-1">
          <li>Multi-chain donations: ETH, USDC, FLW (BTC and privacy coins coming soon)</li>
          <li>Campaigns launch with a wallet or email — no approval process</li>
          <li>All activity is transparently stored on-chain</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4">How are platform fees handled?</h2>
        <p className="mb-4">
          FreeFlow charges a <strong>2% protocol fee</strong> on all donations except FLW. FLW
          donations (coming post-MVP) receive a discounted <strong>0.5%</strong> fee.
        </p>
        <p className="mb-4">Fees are automatically split via smart contract:</p>
        <ul className="list-disc pl-6 mb-6 space-y-1">
          <li><strong>40%</strong> Validator Pool</li>
          <li><strong>25%</strong> Core Team</li>
          <li><strong>20%</strong> Treasury</li>
          <li><strong>10%</strong> Marketing</li>
          <li><strong>5%</strong> Research & Development (R&D)</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4">Where do my donations go?</h2>
        <p className="mb-6">
          Donations go <strong>directly to the campaign’s smart contract</strong>. Campaign
          owners can withdraw funds <strong>at any time after the campaign ends</strong>.
          Donations are currently accepted in <strong>ETH</strong> and <strong>USDC</strong>,
          with more assets coming soon.
        </p>

        <h2 className="text-2xl font-semibold mb-4">What is FLW and how will it be used?</h2>
        <ul className="list-disc pl-6 mb-6 space-y-1">
          <li>Governance via DAO voting</li>
          <li>Staking for validator access</li>
          <li>Fee discounts and campaign boosting</li>
          <li>Revenue sharing with stakers</li>
          <li>Future airdrop eligibility for early ETH/USDC donors</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4">What are validators?</h2>
        <p className="mb-6">
          Validators will be able to stake FLW and curate campaigns. If they vouch for
          fraudulent ones, they risk slashing. Validators earn a share of protocol revenue
          for honest participation. This system will be active post-MVP.
        </p>

        <h2 className="text-2xl font-semibold mb-4">Can I donate anonymously?</h2>
        <p className="mb-6">
          Privacy tools are coming in future versions — including burner wallets, relayers,
          and Zcash/Monero integrations.
        </p>

        <h2 className="text-2xl font-semibold mb-4">What chains does FreeFlow support?</h2>
        <p className="mb-6">
          FreeFlow is live on <strong>Base</strong>. Support for Arbitrum and Polygon is
          expected in Q4 2025. Bitcoin and privacy chains are targeted for 2026.
        </p>

        <h2 className="text-2xl font-semibold mb-4">Who is building FreeFlow?</h2>
        <p className="mb-6">
          FreeFlow is led by a founder with <strong>20 years of experience in automation,
          control systems, and electrical engineering</strong>, and over a decade in crypto.
          We’re seeking collaborators in frontend development, validator onboarding, and
          community growth. Email: <a href="mailto:founder@getfreeflow.org" className="underline">founder@getfreeflow.org</a>
        </p>

        <h2 className="text-2xl font-semibold mb-4">Want to help?</h2>
        <p className="mb-2">
          FreeFlow is for those who believe <strong>financial freedom is foundational freedom</strong>.
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>🔨 Builders & validators — we want to hear from you</li>
          <li>🎯 Donors — fund what matters, freely</li>
          <li>🧠 Communities — reclaim your tools of support</li>
        </ul>
      </div>
    </PageContainer>
  );
};

export default About;

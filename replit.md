# FreeFlow - Censorship-Resistant Crowdfunding Platform

## Overview

FreeFlow is a decentralized crowdfunding platform built on blockchain technology that focuses on censorship-resistant funding for principled, freedom-focused causes. The application combines a React frontend with an Express.js backend, utilizing PostgreSQL for data persistence and Drizzle ORM for database management.

## System Architecture

### Frontend Architecture
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite for development and production builds
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom FreeFlow brand colors
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Wallet Integration**: Ethers.js for Web3 wallet connectivity

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **Session Management**: connect-pg-simple for PostgreSQL session store
- **Development**: tsx for TypeScript execution in development

### Build System
- **Monorepo Structure**: Shared types and schemas between client and server
- **Client Build**: Vite bundles React app to `dist/public`
- **Server Build**: esbuild bundles server code to `dist/index.js`
- **Development**: Vite dev server with HMR for client, tsx for server

## Key Components

### Database Schema
- **Users**: Store wallet addresses, usernames, and profile information
- **Campaigns**: Campaign metadata including goals, descriptions, and blockchain addresses
- **Donations**: Transaction records linking donors to campaigns with amounts and token types

### Web3 Integration
- **Wallet Support**: MetaMask, WalletConnect, and Coinbase Wallet
- **Blockchain**: Ethereum-based with multi-token support (ETH, USDC)
- **Smart Contracts**: Campaign factory pattern for deploying individual campaign contracts

### UI Components
- **Campaign Cards**: Display campaign information with progress indicators
- **Wallet Modal**: Connection interface for multiple wallet providers
- **Image Uploader**: IPFS-ready image upload component
- **Responsive Design**: Mobile-first approach with Tailwind CSS

## Data Flow

1. **User Registration**: Wallet connection creates user record with address
2. **Campaign Creation**: Form data validated and stored in database, smart contract deployed
3. **Donations**: Frontend interacts with smart contracts, records stored in database
4. **Campaign Display**: Database queries combined with blockchain state for real-time updates

## External Dependencies

### Blockchain Services
- **Ethereum Network**: Primary blockchain for smart contracts
- **Neon Database**: Serverless PostgreSQL hosting
- **IPFS**: Decentralized image storage (planned implementation)

### Development Tools
- **Replit Integration**: Custom Vite plugins for Replit development environment
- **Drizzle Kit**: Database migrations and schema management
- **ESBuild**: Production server bundling

## Deployment Strategy

### Development
- **Client**: Vite dev server with HMR
- **Server**: tsx with hot reload
- **Database**: Drizzle push for schema updates

### Production
- **Client**: Static files served from `dist/public`
- **Server**: Node.js running bundled `dist/index.js`
- **Database**: PostgreSQL with connection pooling
- **Environment**: Requires `DATABASE_URL` environment variable

### Build Process
1. `npm run build` - Builds both client and server
2. Client assets bundled to `dist/public`
3. Server code bundled to `dist/index.js`
4. `npm start` - Runs production server

## Changelog

```
Changelog:
- July 07, 2025. Performance optimization and locked balance consistency completed
  - Implemented pagination system for Browse Campaigns (loads 5 campaigns initially with "Load More" button)
  - Fixed infinite refresh loops and reduced loading time from 20+ seconds to under 5 seconds
  - Added locked balance feature to campaign detail modal for ended campaigns
  - ETH balance and progress percentage now lock permanently when campaigns end
  - Consistent final balance display across Browse, My Campaigns, and modal views
  - Auto-refresh frequency reduced to 60 seconds to prevent performance issues
- July 07, 2025. Real donation functionality and UI improvements completed
  - Campaign detail modal now shows real blockchain updates instead of placeholder data
  - Modal donation function now calls actual smart contract donateETH() instead of fake transactions
  - Added 2-second delay before closing modal after successful donation for better UX
  - Campaign detail page auto-refreshes after owner posts updates (1-second delay)
  - Browse Campaigns page now auto-refreshes every 30 seconds to show new campaigns
  - Fixed React hooks rule violation in campaign modal that was causing error page
  - Cleaned up unused imports in campaign modal component
- July 06, 2025. Campaign updates and data refresh improvements
  - Campaign detail page now shows real blockchain updates instead of placeholder data
  - Added refresh button to Browse Campaigns page for fetching latest data
  - Fixed campaign updates section to use actual getUpdateCount() and getUpdate() functions
  - New campaigns now appear properly after page refresh or manual refresh
- July 06, 2025. My Campaigns page restored with fixed routing
  - Restored card-based layout for My Campaigns page per user preference
  - Fixed campaign detail routing to use actual contract addresses instead of placeholders
  - Fixed ABI compatibility in campaign detail page (restored deadline() function)
  - Campaign detail page now loads real blockchain data properly
  - Cleaned up unused imports and variables
- July 06, 2025. Campaign modal system unified and improved
  - Both Browse and My Campaigns pages now use consistent modal approach
  - Removed "View Analytics" buttons since analytics tracking not implemented
  - Donation interface now properly hidden on ended campaigns
  - Added status-specific messages for ended and goal-met campaigns
  - Improved user experience with proper campaign state handling
- July 06, 2025. ABI compatibility and rate limiting issues resolved
  - Fixed ABI mismatch preventing campaign data loading from deployed contracts
  - Implemented sequential processing with delays to prevent MetaMask API throttling
  - Browse Campaigns page now loads all campaigns without wallet connection required
  - My Campaigns page properly filters and displays user's campaigns
  - Fixed broken "Create New Campaign" links to use correct route
  - All contract interactions now use minimal ABI matching deployed contracts
- July 06, 2025. Real blockchain data integration completed
  - Browse Campaigns page now fetches all campaigns from smart contract factory
  - My Campaigns page filters campaigns by wallet owner with real statistics
  - Added comprehensive loading states and error handling for all pages
  - Replaced all placeholder data with live blockchain data
  - Added empty states with helpful messaging for better user experience
  - Real-time progress calculations and campaign status updates
  - Search and filter functionality working with actual campaign data
- July 06, 2025. Platform ready for launch - all core functionality working
  - Admin panel fully integrated with real contract data
  - FeeDistributor shows actual collected fees ready for distribution
  - One-click fee distribution automatically gets full balance and distributes
  - Owner-only admin links visible in navbar when connected with owner wallet
  - Complete fee collection and distribution flow verified working
  - Manual distribution transaction issue resolved (was passing 0 amount)
- July 06, 2025. Balance display and donation flow fully working
  - Fixed balance refresh methods to match old frontend pattern
  - Total balance uses provider.getBalance() for actual contract ETH
  - Withdrawable balance correctly parses getWithdrawableAmount() return values
  - Fee calculation working: 2% ETH fees properly deducted and displayed
  - Fixed test flow bug that showed fake donations on transaction failures
  - Enhanced error handling to show clear campaign expiration messages
- July 06, 2025. Complete campaign flow verified working
  - Donations via donateETH() function confirmed working
  - Fund withdrawal after campaign end confirmed working
  - Balance calculations using getWithdrawableAmount() working correctly
  - Contract ABI fully compatible with deployed smart contracts
- July 06, 2025. Fixed contract ABI compatibility with deployed contracts
  - Campaign contracts use campaignOwner() not owner() 
  - FeeDistributor contract uses owner() for platform access
  - Admin panel uses hardcoded OWNER_ADDRESS for access control
- July 06, 2025. Added About, FAQ, and How It Works pages with proper routing
- July 05, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```
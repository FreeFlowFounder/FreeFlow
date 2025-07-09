# FreeFlow - Decentralized Crowdfunding Platform

FreeFlow is a censorship-resistant crowdfunding platform built on blockchain technology, focusing on principled, freedom-focused causes.

## Features

- **Multi-token Support**: ETH, USDC, and FLW donations
- **Multi-wallet Integration**: MetaMask, WalletConnect, Coinbase Wallet
- **Real-time Campaign Tracking**: Live progress updates and blockchain integration
- **Mobile-Responsive Design**: Optimized for all devices
- **Admin Panel**: Fee management and distribution system

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **UI**: Tailwind CSS, Radix UI, shadcn/ui
- **Blockchain**: Ethers.js, Base network
- **Backend**: Node.js, Express, PostgreSQL
- **Database**: Drizzle ORM with Neon Database

## Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd freeflow
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy environment template
   cp client/.env.example client/.env
   
   # Edit client/.env with your settings
   VITE_NETWORK=testnet
   VITE_ALLOW_FLW=false
   VITE_PLATFORM_OWNER_ADDRESS=0x535f7b11e4F9B77d8ef04A564e09E0B4feE75fb3
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

### Deployment

#### Vercel (Frontend Only)
1. **Build the client**
   ```bash
   vite build
   ```

2. **Deploy to Vercel**
   - Connect your GitHub repository to Vercel
   - Set environment variables in Vercel dashboard
   - Deploy automatically triggers on git push

#### Full Stack (Replit)
1. **Push to Replit**
   - Import repository to Replit
   - Set environment variables in Replit secrets
   - Click "Run" to start the application

## Environment Variables

### Required for Frontend
- `VITE_NETWORK`: Network mode (testnet/mainnet)
- `VITE_ALLOW_FLW`: Enable FLW token support (true/false)
- `VITE_PLATFORM_OWNER_ADDRESS`: Platform owner wallet address

### Required for Backend
- `DATABASE_URL`: PostgreSQL connection string

## Smart Contract Integration

The platform integrates with deployed smart contracts on Base network:

- **Campaign Factory**: Creates new campaign contracts
- **Individual Campaigns**: Handle donations and withdrawals
- **Fee Distributor**: Manages platform fee collection

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Route pages
│   │   ├── hooks/         # Custom hooks
│   │   ├── lib/           # Utilities and contracts
│   │   └── types/         # TypeScript types
├── server/                # Express backend
├── shared/                # Shared types and schemas
└── dist/                  # Build output
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - See LICENSE file for details
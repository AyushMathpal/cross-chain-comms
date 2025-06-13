# Cross-Chain Messenger

A comprehensive, modern frontend for sending messages between different blockchain networks using the Hyperlane protocol. Built with Next.js 15, React 19, and featuring real cross-chain messaging capabilities with persistent message history.

## Features

- 🔗 **Real Cross-Chain Messaging**: Send messages between different blockchain networks using actual Hyperlane contracts
- 👥 **Person-to-Person Messaging**: Send messages to any Ethereum address across supported chains
- 💾 **Message Persistence**: MongoDB integration with localStorage fallback for reliable message storage
- 🕒 **Message History**: View, filter, and paginate through sent and received messages
- 📊 **Real-time Tracking**: Monitor message delivery status with automatic updates
- 💼 **Multi-Wallet Support**: Connect with MetaMask, WalletConnect, and other popular wallets
- 🔄 **Chain Switching**: Seamlessly switch between different networks
- 💰 **Fee Estimation**: Real-time gas fee calculation with caching for efficiency
- 🎨 **Modern UI**: Beautiful, responsive design with message cards, filters, and pagination
- ⚡ **Live Updates**: Real-time message delivery monitoring and incoming message detection

## Supported Networks

- Ethereum Sepolia (Testnet) - Chain ID: 11155111
- Polygon Mumbai (Testnet) - Chain ID: 80001
- Arbitrum Sepolia (Testnet) - Chain ID: 421614
- Avalanche Fuji (Testnet) - Chain ID: 43113

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MetaMask or another Web3 wallet
- Testnet ETH for gas fees
- MongoDB Atlas account (optional - app works with localStorage fallback)

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd cross-chain-comms
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory:

```bash
# Required for wallet connections
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Optional: MongoDB for message persistence (app works without this)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/cross-chain-comms

# Optional: Custom RPC URLs for better performance
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://your-sepolia-rpc
NEXT_PUBLIC_POLYGON_MUMBAI_RPC_URL=https://your-polygon-mumbai-rpc
NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL=https://your-arbitrum-sepolia-rpc
NEXT_PUBLIC_AVALANCHE_FUJI_RPC_URL=https://your-avalanche-fuji-rpc
```

4. Get a WalletConnect Project ID:

   - Go to [WalletConnect Cloud](https://cloud.walletconnect.com/)
   - Create a new project
   - Copy your Project ID and add it to your `.env.local` file

5. (Optional) Set up MongoDB:

   - Create a MongoDB Atlas account at [mongodb.com](https://www.mongodb.com/atlas)
   - Create a new cluster and database
   - Get your connection string and add it to `.env.local`
   - **Note**: The app works perfectly without MongoDB using localStorage

6. Start the development server:

```bash
npm run dev
```

The app will run on [http://localhost:4040](http://localhost:4040)

## How to Use

### 1. Connect Your Wallet

- Click the "Connect Wallet" button in the top right
- Select your preferred wallet (MetaMask recommended)
- Approve the connection

### 2. Select Chains and Recipient

- Choose your **Source Chain** (where you'll send the message from)
- Choose your **Destination Chain** (where the message will be delivered)
- Enter the **recipient's Ethereum address** (or select from test addresses)

### 3. Send a Message

- Make sure you're connected to the source chain (the app will prompt you to switch if needed)
- Type your message in the text area
- Review the estimated gas fee
- Click "Send Message"
- Approve the transaction in your wallet

### 4. Track Your Messages

- **Real-time Status Updates**:
  - **Sending**: Transaction is being processed on source chain
  - **Sent**: Message sent, waiting for cross-chain delivery
  - **Delivered**: Message successfully delivered to destination chain
- **Message History**: View all sent and received messages
- **Filtering**: Filter messages by "All", "Sent", or "Received"
- **Pagination**: Navigate through message history with page controls
- **Transaction Links**: Click on transaction hashes to view on block explorers

### 5. Receive Messages

- The app automatically listens for incoming messages across all supported chains
- Received messages appear in real-time in your message history
- No action required - just keep the app open to receive messages

## Architecture

### Project Structure

```
app/
├── components/
│   ├── CrossChainMessenger.tsx    # Main messaging interface
│   ├── MessageHistory.tsx         # Message list and filtering
│   ├── MessageCard.tsx           # Individual message display
│   ├── MessageFilters.tsx        # Filter controls
│   └── PaginationControls.tsx    # Pagination interface
├── lib/
│   ├── hyperlane.ts              # Hyperlane service and contracts
│   └── database.ts               # MongoDB integration with fallback
├── hooks/
│   ├── usePagination.ts          # Pagination logic
│   └── useMessageExpansion.ts    # Message expand/collapse
├── api/
│   └── messages/
│       └── route.ts              # REST API for message operations
├── globals.css                   # Global styles
├── layout.tsx                    # Root layout with providers
├── page.tsx                      # Main page component
└── providers.tsx                 # Wallet and blockchain providers
```

### Key Technologies

- **Next.js 15**: React framework with App Router and API routes
- **React 19**: Latest React with concurrent features
- **Hyperlane SDK**: Real cross-chain messaging protocol
- **Wagmi**: React hooks for Ethereum
- **RainbowKit**: Wallet connection UI
- **Viem**: TypeScript Ethereum library
- **MongoDB/Mongoose**: Message persistence with fallback
- **Ethers.js**: Ethereum interaction library
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Modern icon library

### Data Flow

1. **Message Sending**: User sends message → Hyperlane contract → Cross-chain delivery
2. **Message Persistence**: Messages saved to MongoDB (with localStorage fallback)
3. **Real-time Updates**: Automatic delivery monitoring and status updates
4. **Message History**: API endpoints serve filtered, paginated message lists
5. **Incoming Messages**: Event listeners detect and display received messages

## Environment Variables

### Required

```bash
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

### Optional

```bash
# Database (app works without this)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Custom RPC URLs for better performance
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://your-sepolia-rpc
NEXT_PUBLIC_POLYGON_MUMBAI_RPC_URL=https://your-polygon-mumbai-rpc
NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL=https://your-arbitrum-sepolia-rpc
NEXT_PUBLIC_AVALANCHE_FUJI_RPC_URL=https://your-avalanche-fuji-rpc
```

## API Endpoints

- `GET /api/messages?userAddress=0x...&direction=sent|received` - Fetch messages
- `POST /api/messages` - Save new message
- `PATCH /api/messages` - Update message status

## Troubleshooting

### Common Issues

1. **"Connect Wallet" not working**

   - Make sure MetaMask is installed and unlocked
   - Check that you're on a supported network
   - Try refreshing the page

2. **Transaction failing**

   - Ensure you have enough testnet ETH for gas
   - Check that you're on the correct source chain
   - Try increasing gas limit in MetaMask

3. **Chain switching not working**

   - Add the networks to MetaMask manually if needed
   - Some wallets require manual network configuration

4. **Messages not saving**
   - Check MongoDB connection (or continue using localStorage)
   - Ensure proper environment variables are set

### Getting Testnet ETH

- **Sepolia**: [Sepolia Faucet](https://sepoliafaucet.com/)
- **Polygon Mumbai**: [Mumbai Faucet](https://mumbaifaucet.com/)
- **Arbitrum Sepolia**: [Arbitrum Faucet](https://faucet.arbitrum.io/)
- **Avalanche Fuji**: [Avalanche Faucet](https://faucet.avax.network/)

## Technical Features

### Hyperlane Integration

- Real contract interactions with Hyperlane mailboxes
- Proper fee estimation and caching
- Message delivery monitoring
- Support for all major testnets

### Message Persistence

- MongoDB integration for production use
- Automatic localStorage fallback
- API endpoints for message operations
- Message filtering and pagination

### Performance Optimizations

- Fee estimation caching (2-minute cache)
- Efficient message filtering and pagination
- Real-time updates without constant polling
- Optimized contract calls

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For questions or issues:

- Open a GitHub issue
- Check existing documentation
- Review the troubleshooting section above

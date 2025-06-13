# Cross-Chain Messenger

A beautiful, modern frontend for sending messages across different blockchains using Hyperlane protocol. Built with Next.js 15, React 19, and integrated with MetaMask via RainbowKit.

## Features

- 🔗 **Cross-Chain Messaging**: Send messages between different blockchain networks
- 💼 **Multi-Wallet Support**: Connect with MetaMask, WalletConnect, and other popular wallets
- 🔄 **Chain Switching**: Seamlessly switch between different networks
- 📊 **Transaction Tracking**: Monitor both source and destination transaction hashes
- 🎨 **Modern UI**: Beautiful, responsive design built with Tailwind CSS
- ⚡ **Real-time Updates**: Live status updates for message delivery

## Supported Networks

- Ethereum Sepolia (Testnet)
- Polygon Mumbai (Testnet)
- Arbitrum Sepolia (Testnet)
- Avalanche Fuji (Testnet)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MetaMask or another Web3 wallet
- Testnet ETH for gas fees

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

```bash
cp .env.local.example .env.local
```

4. Get a WalletConnect Project ID:

   - Go to [WalletConnect Cloud](https://cloud.walletconnect.com/)
   - Create a new project
   - Copy your Project ID
   - Add it to your `.env.local` file:

   ```
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
   ```

5. Start the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## How to Use

### 1. Connect Your Wallet

- Click the "Connect Wallet" button in the top right
- Select your preferred wallet (MetaMask recommended)
- Approve the connection

### 2. Select Chains

- Choose your **Source Chain** (where you'll send the message from)
- Choose your **Destination Chain** (where the message will be delivered)
- The app will automatically filter to prevent selecting the same chain twice

### 3. Send a Message

- Make sure you're connected to the source chain (the app will prompt you to switch if needed)
- Type your message in the text area
- Click "Send Message"
- Approve the transaction in your wallet

### 4. Track Your Message

- Watch the real-time status updates:
  - **Sending**: Transaction is being processed on source chain
  - **Sent**: Message sent, waiting for cross-chain delivery
  - **Delivered**: Message successfully delivered to destination chain
- Click on transaction hashes to view on block explorers

## Development

### Project Structure

```
app/
├── components/
│   └── CrossChainMessenger.tsx  # Main messaging component
├── globals.css                  # Global styles
├── layout.tsx                   # Root layout with providers
├── page.tsx                     # Main page component
└── providers.tsx                # Wallet and blockchain providers
```

### Key Technologies

- **Next.js 15**: React framework with App Router
- **React 19**: Latest React with concurrent features
- **Wagmi**: React hooks for Ethereum
- **RainbowKit**: Wallet connection UI
- **Viem**: TypeScript Ethereum library
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Modern icon library

### Adding Real Hyperlane Integration

Currently, the app simulates cross-chain messaging for demo purposes. To integrate real Hyperlane functionality:

1. Install Hyperlane SDK:

```bash
npm install @hyperlane-xyz/sdk ethers
```

2. Replace the simulation code in `CrossChainMessenger.tsx` with actual Hyperlane contract calls
3. Add proper contract addresses for each supported network
4. Implement message verification and tracking

## Environment Variables

Create a `.env.local` file with:

```bash
# Required
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# Optional: Custom RPC URLs for better performance
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://your-sepolia-rpc
NEXT_PUBLIC_POLYGON_MUMBAI_RPC_URL=https://your-polygon-mumbai-rpc
NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL=https://your-arbitrum-sepolia-rpc
NEXT_PUBLIC_AVALANCHE_FUJI_RPC_URL=https://your-avalanche-fuji-rpc
```

## Troubleshooting

### Common Issues

1. **"Connect Wallet" not working**

   - Make sure MetaMask is installed
   - Check that you're on a supported network
   - Try refreshing the page

2. **Transaction failing**

   - Ensure you have enough testnet ETH for gas
   - Check that you're on the correct source chain
   - Try increasing gas limit in MetaMask

3. **Chain switching not working**
   - Add the networks to MetaMask manually if needed
   - Some wallets require manual network configuration

### Getting Testnet ETH

- **Sepolia**: [Sepolia Faucet](https://sepoliafaucet.com/)
- **Polygon Mumbai**: [Mumbai Faucet](https://mumbaifaucet.com/)
- **Arbitrum Sepolia**: [Arbitrum Faucet](https://faucet.arbitrum.io/)
- **Avalanche Fuji**: [Avalanche Faucet](https://faucet.avax.network/)

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

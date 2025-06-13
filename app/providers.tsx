"use client";

import "@rainbow-me/rainbowkit/styles.css";
import {
  RainbowKitProvider,
  connectorsForWallets,
} from "@rainbow-me/rainbowkit";
import { WagmiProvider, createConfig, http } from "wagmi";
import {
  sepolia,
  polygonAmoy,
  arbitrumSepolia,
  avalancheFuji,
} from "wagmi/chains";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { metaMaskWallet, injectedWallet } from "@rainbow-me/rainbowkit/wallets";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet, injectedWallet],
    },
  ],
  {
    appName: "Cross-Chain Messenger",
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "fallback",
  }
);

const config = createConfig({
  connectors,
  chains: [sepolia, polygonAmoy, arbitrumSepolia, avalancheFuji],
  transports: {
    [sepolia.id]: http("https://rpc.sepolia.ethpandaops.io"),
    [polygonAmoy.id]: http("https://rpc-amoy.polygon.technology"),
    [arbitrumSepolia.id]: http("https://sepolia-rollup.arbitrum.io/rpc"),
    [avalancheFuji.id]: http("https://api.avax-test.network/ext/bc/C/rpc"),
  },
  ssr: true,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider modalSize="compact">{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

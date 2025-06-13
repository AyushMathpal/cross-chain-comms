"use client";

import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import {
  sepolia,
  polygonMumbai,
  arbitrumSepolia,
  avalancheFuji,
} from "wagmi/chains";
import { MessageCircle } from "lucide-react";
import { CrossChainMessenger } from "./components/CrossChainMessenger";

const supportedChains = [
  sepolia,
  polygonMumbai,
  arbitrumSepolia,
  avalancheFuji,
];

export default function Home() {
  const { isConnected } = useAccount();
  const currentChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [selectedSourceChain, setSelectedSourceChain] = useState<number>(
    sepolia.id
  );
  const [selectedDestChain, setSelectedDestChain] = useState<number>(
    polygonMumbai.id
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <MessageCircle className="h-8 w-8 text-indigo-600" />
              <h1 className="text-xl font-bold text-gray-900">
                Cross-Chain Messenger
              </h1>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {!isConnected ? (
          <div className="text-center py-12">
            <MessageCircle className="h-16 w-16 text-indigo-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome to Cross-Chain Messenger
            </h2>
            <p className="text-gray-600 mb-8">
              Send messages across different blockchains using Hyperlane
              protocol
            </p>
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
              <p className="text-gray-700 mb-4">
                Connect your wallet to get started
              </p>
              <ConnectButton />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Select Chains
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Source Chain
                  </label>
                  <select
                    value={selectedSourceChain}
                    onChange={(e) =>
                      setSelectedSourceChain(Number(e.target.value))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {supportedChains.map((chain) => (
                      <option key={chain.id} value={chain.id}>
                        {chain.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destination Chain
                  </label>
                  <select
                    value={selectedDestChain}
                    onChange={(e) =>
                      setSelectedDestChain(Number(e.target.value))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {supportedChains
                      .filter((chain) => chain.id !== selectedSourceChain)
                      .map((chain) => (
                        <option key={chain.id} value={chain.id}>
                          {chain.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            <CrossChainMessenger
              sourceChainId={selectedSourceChain}
              destChainId={selectedDestChain}
              currentChainId={currentChainId}
              switchChain={switchChain}
            />
          </div>
        )}
      </main>
    </div>
  );
}

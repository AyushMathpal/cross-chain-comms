"use client";

import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import {
  sepolia,
  polygonAmoy,
  arbitrumSepolia,
  avalancheFuji,
} from "wagmi/chains";
import { MessageCircle } from "lucide-react";
import { CrossChainMessenger } from "./components/CrossChainMessenger";

const supportedChains = [sepolia, polygonAmoy, arbitrumSepolia, avalancheFuji];

export default function Home() {
  const { isConnected } = useAccount();
  const currentChainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [selectedSourceChain, setSelectedSourceChain] = useState<number>(
    polygonAmoy.id
  );
  const [selectedDestChain, setSelectedDestChain] = useState<number>(
    sepolia.id
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>
      </div>

      <header className="relative z-10 bg-white/10 backdrop-blur-lg border-b border-white/20 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4 group">
              <div className="relative">
                <MessageCircle className="h-10 w-10 text-white drop-shadow-lg transform group-hover:scale-110 transition-all duration-300 group-hover:rotate-12" />
                <div className="absolute inset-0 h-10 w-10 bg-white/20 rounded-full blur-xl group-hover:bg-white/30 transition-all duration-300"></div>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-100 to-gray-300 bg-clip-text text-transparent drop-shadow-sm">
                Cross-Chain Messenger
              </h1>
            </div>
            <div className="transform hover:scale-105 transition-transform duration-200">
              <ConnectButton />
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-4 py-12">
        {!isConnected ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 bg-gradient-to-r from-slate-600 to-gray-700 rounded-full blur-2xl opacity-40 animate-pulse"></div>
              </div>
              <MessageCircle className="relative h-20 w-20 text-white mx-auto animate-bounce drop-shadow-2xl" />
            </div>

            <div className="space-y-6 transform hover:scale-105 transition-all duration-500">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-100 via-gray-200 to-gray-300 bg-clip-text text-transparent drop-shadow-lg">
                Welcome to Cross-Chain Messenger
              </h2>
              <p className="text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
                Send messages across different blockchains using Hyperlane
                protocol with lightning speed and security
              </p>
            </div>

            <div className="mt-12 transform hover:scale-105 transition-all duration-300">
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md mx-auto border border-white/20 hover:bg-white/15 transition-all duration-300">
                <div className="space-y-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-slate-600 to-gray-700 rounded-2xl mx-auto flex items-center justify-center shadow-xl">
                    <MessageCircle className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-white/90 text-lg font-medium">
                    Connect your wallet to get started
                  </p>
                  <div className="transform hover:scale-105 transition-transform duration-200">
                    <ConnectButton />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-slide-in-from-bottom">
            <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 group">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-slate-600 to-gray-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
                <h3 className="text-2xl font-bold text-white">Select Chains</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-white/90 uppercase tracking-wider">
                    Source Chain
                  </label>
                  <div className="relative group">
                    <select
                      value={selectedSourceChain}
                      onChange={(e) =>
                        setSelectedSourceChain(Number(e.target.value))
                      }
                      className="w-full bg-white/10 backdrop-blur-lg border border-white/30 rounded-2xl px-4 py-4 text-white focus:outline-none focus:ring-4 focus:ring-slate-500/50 focus:border-slate-400 transition-all duration-300 hover:bg-white/20 appearance-none cursor-pointer font-medium"
                    >
                      {supportedChains.map((chain) => (
                        <option
                          key={chain.id}
                          value={chain.id}
                          className="bg-gray-800 text-white"
                        >
                          {chain.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-white/90 uppercase tracking-wider">
                    Destination Chain
                  </label>
                  <div className="relative group">
                    <select
                      value={selectedDestChain}
                      onChange={(e) =>
                        setSelectedDestChain(Number(e.target.value))
                      }
                      className="w-full bg-white/10 backdrop-blur-lg border border-white/30 rounded-2xl px-4 py-4 text-white focus:outline-none focus:ring-4 focus:ring-gray-500/50 focus:border-gray-400 transition-all duration-300 hover:bg-white/20 appearance-none cursor-pointer font-medium"
                    >
                      {supportedChains.map((chain) => (
                        <option
                          key={chain.id}
                          value={chain.id}
                          className="bg-gray-800 text-white"
                        >
                          {chain.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="transform hover:scale-[1.02] transition-all duration-300">
              <CrossChainMessenger
                sourceChainId={selectedSourceChain}
                destChainId={selectedDestChain}
                currentChainId={currentChainId}
                switchChain={switchChain}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

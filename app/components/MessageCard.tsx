"use client";

import {
  Send,
  CheckCircle,
  Clock,
  ExternalLink,
  AlertCircle,
  Inbox,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { HyperlaneMessage } from "../lib/hyperlane";

interface MessageCardProps {
  message: HyperlaneMessage;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const chainNames: { [key: number]: string } = {
  11155111: "Sepolia",
  80002: "Polygon Amoy",
  421614: "Arbitrum Sepolia",
  43113: "Avalanche Fuji",
};

const getStatusIcon = (status: HyperlaneMessage["status"]) => {
  switch (status) {
    case "sending":
      return <Clock className="h-5 w-5 text-yellow-500 animate-spin" />;
    case "sent":
      return <Clock className="h-5 w-5 text-blue-500" />;
    case "delivered":
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case "failed":
      return <AlertCircle className="h-5 w-5 text-red-500" />;
  }
};

const getStatusText = (status: HyperlaneMessage["status"]) => {
  switch (status) {
    case "sending":
      return "Sending to Hyperlane...";
    case "sent":
      return "Sent - Monitoring delivery";
    case "delivered":
      return "✅ Delivered on destination";
    case "failed":
      return "❌ Delivery failed or timeout";
  }
};

const getExplorerUrl = (chainId: number, txHash: string) => {
  const explorers: { [key: number]: string } = {
    11155111: `https://sepolia.etherscan.io/tx/${txHash}`,
    80002: `https://amoy.polygonscan.com/tx/${txHash}`,
    421614: `https://sepolia.arbiscan.io/tx/${txHash}`,
    43113: `https://testnet.snowtrace.io/tx/${txHash}`,
  };
  return explorers[chainId] || `#`;
};

export function MessageCard({
  message: msg,
  isExpanded,
  onToggleExpand,
}: MessageCardProps) {
  return (
    <div
      className={`border rounded-lg transition-all duration-200 hover:shadow-sm ${
        msg.direction === "received"
          ? "border-green-200 bg-green-50"
          : "border-blue-200 bg-blue-50"
      }`}
    >
      <div className="p-4 cursor-pointer" onClick={onToggleExpand}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 max-w-[80%]">
            {msg.direction === "received" ? (
              <Inbox className="h-5 w-5 text-green-600 flex-shrink-0" />
            ) : (
              getStatusIcon(msg.status)
            )}

            <div className="flex-1 overflow-hidden">
              <div className="flex items-center space-x-2 mb-1">
                <span
                  className={`font-medium text-sm ${
                    msg.direction === "received"
                      ? "text-green-800"
                      : "text-blue-800"
                  }`}
                >
                  {msg.direction === "received"
                    ? "Received"
                    : getStatusText(msg.status)}
                </span>
                <span className="text-xs text-gray-500">
                  {chainNames[msg.sourceChain]} → {chainNames[msg.destChain]}
                </span>
              </div>
              <p className="text-sm text-gray-700 line-clamp-2 text-ellipsis break-words">
                &ldquo;{msg.content}&rdquo;
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right text-xs text-gray-500">
              <div>{new Date(msg.timestamp).toLocaleDateString()}</div>
              <div>{new Date(msg.timestamp).toLocaleTimeString()}</div>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <p className="text-gray-800 leading-relaxed line-clamp-2 max-w-[10rem] text-ellipsis">
              &ldquo;{msg.content}&rdquo;
            </p>
          </div>

          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Source</div>
                <div className="font-semibold text-sm">
                  {chainNames[msg.sourceChain]}
                </div>
                <div className="text-xs text-gray-400">
                  ID: {msg.sourceChain}
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="flex items-center space-x-2">
                  <div className="h-0.5 bg-gradient-to-r from-blue-400 to-purple-500 w-8"></div>
                  <Send className="h-3 w-3 text-purple-500" />
                  <div className="h-0.5 bg-gradient-to-r from-purple-500 to-green-400 w-8"></div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Destination</div>
                <div className="font-semibold text-sm">
                  {chainNames[msg.destChain]}
                </div>
                <div className="text-xs text-gray-400">ID: {msg.destChain}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <div className="text-xs text-gray-500 mb-1">Sender</div>
              <div className="font-mono text-xs text-gray-800">
                {msg.sender}
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-100">
              <div className="text-xs text-gray-500 mb-1">Recipient</div>
              <div className="font-mono text-xs text-gray-800">
                {msg.recipient}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {msg.estimatedFee && (
              <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-gray-100">
                <span className="text-xs text-gray-600">Transaction Fee</span>
                <span className="font-medium text-sm">
                  {parseFloat(msg.estimatedFee).toFixed(6)} ETH
                </span>
              </div>
            )}

            {msg.sourceTxHash && (
              <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-gray-100">
                <span className="text-xs text-gray-600">
                  Source Transaction
                </span>
                <a
                  href={getExplorerUrl(msg.sourceChain, msg.sourceTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-indigo-600 hover:text-indigo-800"
                >
                  <span className="font-mono text-xs">
                    {msg.sourceTxHash.slice(0, 8)}...
                    {msg.sourceTxHash.slice(-6)}
                  </span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {msg.destTxHash && (
              <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-gray-100">
                <span className="text-xs text-gray-600">
                  Destination Transaction
                </span>
                <a
                  href={getExplorerUrl(msg.destChain, msg.destTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-indigo-600 hover:text-indigo-800"
                >
                  <span className="font-mono text-xs">
                    {msg.destTxHash.slice(0, 8)}...{msg.destTxHash.slice(-6)}
                  </span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {msg.messageId && (
              <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-gray-100">
                <span className="text-xs text-gray-600">Message ID</span>
                <span className="font-mono text-xs text-gray-800">
                  {msg.messageId.slice(0, 10)}...{msg.messageId.slice(-8)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

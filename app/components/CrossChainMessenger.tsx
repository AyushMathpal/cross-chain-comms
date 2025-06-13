"use client";

import { useState, useEffect } from "react";
import { Send, AlertCircle } from "lucide-react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import { HyperlaneService, HyperlaneMessage } from "../lib/hyperlane";
import { MessageHistory } from "./MessageHistory";

interface CrossChainMessengerProps {
  sourceChainId: number;
  destChainId: number;
  currentChainId: number;
  switchChain: (options: { chainId: number }) => void;
}

const chainNames: { [key: number]: string } = {
  11155111: "Sepolia",
  80001: "Polygon Mumbai",
  421614: "Arbitrum Sepolia",
  43113: "Avalanche Fuji",
};

const testAddresses = {
  "Your Address (Self-test)": "",
  "Ethereum Foundation": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "Test Address 1": "0x1111111111111111111111111111111111111111",
  "Test Address 2": "0x2222222222222222222222222222222222222222",
  "Test Address 3": "0x3333333333333333333333333333333333333333",
};

export function CrossChainMessenger({
  sourceChainId,
  destChainId,
  currentChainId,
  switchChain,
}: CrossChainMessengerProps) {
  const { address } = useAccount();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<HyperlaneMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [estimatedFee, setEstimatedFee] = useState<string>("");
  const [hyperlaneService, setHyperlaneService] =
    useState<HyperlaneService | null>(null);
  const [recipient, setRecipient] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
      setHyperlaneService(new HyperlaneService(ethersProvider));
    }
  }, []);

  useEffect(() => {
    if (hyperlaneService && address) {
      loadMessageHistory();
      setupIncomingMessageListener();
    }
  }, [hyperlaneService, address]);

  useEffect(() => {
    const estimateFee = async () => {
      if (hyperlaneService && message.trim() && recipient && address) {
        try {
          if (!ethers.utils.isAddress(recipient)) {
            setEstimatedFee("");
            return;
          }

          const fee = await hyperlaneService.estimateFee(
            sourceChainId,
            destChainId,
            recipient,
            message
          );
          setEstimatedFee(fee);
        } catch (error) {
          console.error("Error estimating fee:", error);
          setEstimatedFee("0.001");
        }
      }
    };

    estimateFee();
  }, [
    hyperlaneService,
    message,
    sourceChainId,
    destChainId,
    recipient,
    address,
  ]);

  const availableTestAddresses = {
    ...testAddresses,
    "Your Address (Self-test)": address || "",
  };

  const loadMessageHistory = async () => {
    if (!hyperlaneService || !address) return;

    setIsLoadingHistory(true);
    try {
      const persistedMessages = await hyperlaneService.loadMessageHistory(
        address
      );
      const allMessages = [...persistedMessages];
      const uniqueMessages = allMessages.filter(
        (msg, index, self) => index === self.findIndex((m) => m.id === msg.id)
      );

      uniqueMessages.sort((a, b) => b.timestamp - a.timestamp);

      setMessages(uniqueMessages);
    } catch (error) {
      console.error("Error loading message history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const setupIncomingMessageListener = () => {
    if (!hyperlaneService || !address) return;

    const supportedChains = [11155111, 80001, 421614, 43113];

    hyperlaneService.listenForIncomingMessages(
      address,
      supportedChains,
      (incomingMessage) => {
        console.log("📨 New incoming message:", incomingMessage);

        setMessages((prev) => {
          const exists = prev.some((msg) => msg.id === incomingMessage.id);
          if (exists) return prev;

          const updated = [incomingMessage, ...prev];

          if (hyperlaneService && address) {
            hyperlaneService.addMessageToHistory(address, incomingMessage);
          }

          return updated;
        });
      }
    );
  };

  const handleSendMessage = async () => {
    if (!message.trim() || !hyperlaneService || !address || !recipient.trim())
      return;

    if (!ethers.utils.isAddress(recipient.trim())) {
      alert("Please enter a valid Ethereum address (0x...)");
      return;
    }

    if (currentChainId !== sourceChainId) {
      switchChain({ chainId: sourceChainId });
      return;
    }

    setIsLoading(true);

    try {
      const newMessage: HyperlaneMessage = {
        id: Date.now().toString(),
        content: message.trim(),
        sender: address,
        recipient: recipient.trim(),
        sourceChain: sourceChainId,
        destChain: destChainId,
        status: "sending",
        timestamp: Date.now(),
        estimatedFee,
        direction: "sent",
      };

      setMessages((prev) => [newMessage, ...prev]);

      const result = await hyperlaneService.sendMessage(
        sourceChainId,
        destChainId,
        recipient.trim(),
        message.trim()
      );
      if (!result) {
        throw new Error("Failed to send message");
      }

      const updatedMessage = {
        ...newMessage,
        sourceTxHash: result?.txHash,
        messageId: result?.messageId,
        status: "sent" as const,
        estimatedFee: result?.estimatedFee,
      };

      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.id === newMessage.id ? updatedMessage : msg
        );

        if (updated.length > 0) {
          hyperlaneService.addMessageToHistory(address, updated[0]);
        }
        return updated;
      });

      if (result.messageId && result.messageId !== "unknown") {
        hyperlaneService.startDeliveryMonitoring(
          result.messageId,
          (deliveryStatus) => {
            setMessages((prev) => {
              const updated = prev.map((msg) =>
                msg.id === newMessage.id
                  ? {
                      ...msg,
                      destTxHash: deliveryStatus.txHash,
                      status: (deliveryStatus.delivered
                        ? "delivered"
                        : "failed") as HyperlaneMessage["status"],
                    }
                  : msg
              );

              const updatedMessage = updated.find(
                (msg) => msg.id === newMessage.id
              );
              if (updatedMessage) {
                hyperlaneService.addMessageToHistory(address, updatedMessage);
              }
              return updated;
            });
          }
        );
      } else {
        console.warn("No valid messageId received, cannot monitor delivery");
      }

      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => {
        const updated = prev.map((msg) =>
          msg.id === prev[0]?.id
            ? { ...msg, status: "failed" as HyperlaneMessage["status"] }
            : msg
        );

        if (hyperlaneService && address && updated.length > 0) {
          hyperlaneService.addMessageToHistory(address, updated[0]);
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshHistory = () => {
    loadMessageHistory();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Send Cross-Chain Message
        </h3>

        {currentChainId !== sourceChainId && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
              <p className="text-sm text-yellow-700">
                Please switch to {chainNames[sourceChainId]} to send messages
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Address
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
                className={`w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  recipient && !ethers.utils.isAddress(recipient)
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300"
                }`}
              />

              {recipient && !ethers.utils.isAddress(recipient) && (
                <div className="text-red-500 text-xs mt-1">
                  Please enter a valid Ethereum address starting with 0x
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-gray-500 mr-2">Quick fill:</span>
                {Object.entries(availableTestAddresses).map(([label, addr]) => (
                  <button
                    key={label}
                    onClick={() => setRecipient(addr)}
                    disabled={!addr}
                    className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your cross-chain message..."
              rows={3}
              maxLength={250}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex justify-between items-center mt-1">
              <div className="text-xs text-gray-500">
                Maximum 250 characters
              </div>
              <div
                className={`text-xs ${
                  message.length > 250
                    ? "text-red-500"
                    : message.length > 200
                    ? "text-yellow-500"
                    : "text-gray-500"
                }`}
              >
                {message.length}/250
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">From:</span>
              <span className="font-medium">{chainNames[sourceChainId]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">To:</span>
              <span className="font-medium">{chainNames[destChainId]}</span>
            </div>
          </div>

          {estimatedFee && (
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Estimated Fee:</span>
                <span className="font-medium">{estimatedFee} ETH</span>
              </div>
            </div>
          )}

          <button
            onClick={handleSendMessage}
            disabled={
              !message.trim() ||
              message.length > 250 ||
              !recipient.trim() ||
              !ethers.utils.isAddress(recipient.trim()) ||
              isLoading ||
              currentChainId !== sourceChainId ||
              !hyperlaneService
            }
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <Send className="h-4 w-4" />
            <span>{isLoading ? "Sending..." : "Send via Hyperlane"}</span>
          </button>
        </div>
      </div>

      <MessageHistory
        messages={messages}
        isLoading={isLoadingHistory}
        onRefresh={refreshHistory}
      />
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Send, AlertCircle, RefreshCw } from "lucide-react";
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
  80002: "Polygon Amoy",
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
  const [userBalance, setUserBalance] = useState<string>("");
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [lastError, setLastError] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum && address) {
      const ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
      const newService = new HyperlaneService(ethersProvider);
      setHyperlaneService(newService);

      // Clear any previous error states when reinitializing
      setLastError("");
      setUserBalance("");
    }
  }, [currentChainId, address]);

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

          // Check if user is on the correct source chain
          if (currentChainId !== sourceChainId) {
            console.log("⚠️ User is on wrong chain for fee estimation:", {
              currentChain: currentChainId,
              requiredChain: sourceChainId,
            });
            setEstimatedFee("Switch to source chain");
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
          if (error instanceof Error && error.message.includes("network")) {
            setEstimatedFee("Network mismatch");
            setLastError(
              "Please switch to the correct source chain in your wallet"
            );
          } else {
            setEstimatedFee("0.001");
          }
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
    currentChainId,
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

    const supportedChains = [11155111, 80002, 421614, 43113];

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

  const checkUserBalance = async () => {
    if (!hyperlaneService || !address || !window.ethereum) return;

    setIsCheckingBalance(true);
    try {
      // Use the same provider instance as hyperlane service
      const provider = new ethers.providers.Web3Provider(window.ethereum);

      // Ensure we're getting the balance from the current network
      await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();

      console.log(
        "🔍 Checking balance on network:",
        network.chainId,
        "Expected:",
        currentChainId
      );

      // If network mismatch, request chain switch or show appropriate message
      if (network.chainId !== currentChainId) {
        console.warn(
          "⚠️ Network mismatch detected. Wallet network:",
          network.chainId,
          "App network:",
          currentChainId
        );
        setUserBalance("Network mismatch");
        return;
      }

      const balance = await provider.getBalance(address);
      const formattedBalance = ethers.utils.formatEther(balance);
      setUserBalance(formattedBalance);
      console.log(
        "💰 Current balance:",
        formattedBalance,
        getChainNativeToken(currentChainId),
        "on chain:",
        network.chainId
      );
    } catch (error) {
      console.error("Error checking balance:", error);
      setUserBalance("Error");
    } finally {
      setIsCheckingBalance(false);
    }
  };

  const getChainNativeToken = (chainId: number): string => {
    switch (chainId) {
      case 11155111:
        return "ETH"; // Sepolia
      case 80002:
        return "POL"; // Polygon Amoy
      case 421614:
        return "ETH"; // Arbitrum Sepolia
      case 43113:
        return "AVAX"; // Avalanche Fuji
      default:
        return "ETH";
    }
  };

  useEffect(() => {
    if (hyperlaneService && address && currentChainId) {
      checkUserBalance();
    }
  }, [hyperlaneService, address, currentChainId]);

  const handleSendMessage = async () => {
    if (!message.trim() || !hyperlaneService || !address || !recipient.trim())
      return;

    if (!ethers.utils.isAddress(recipient.trim())) {
      setLastError("Please enter a valid Ethereum address (0x...)");
      return;
    }

    // Prevent sending to the same chain
    if (sourceChainId === destChainId) {
      setLastError(
        "Cannot send cross-chain messages to the same chain. Please select different source and destination chains."
      );
      return;
    }

    if (currentChainId !== sourceChainId) {
      switchChain({ chainId: sourceChainId });
      return;
    }

    // Clear previous errors
    setLastError("");
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
      // Refresh balance after successful transaction
      setTimeout(checkUserBalance, 2000);
    } catch (error) {
      console.error("Error sending message:", error);

      // Set user-friendly error message
      if (error instanceof Error) {
        setLastError(error.message);
      } else {
        setLastError(
          "Unknown error occurred. Please check the console for details."
        );
      }

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

        {/* Same Chain Warning */}
        {sourceChainId === destChainId && (
          <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-orange-400 mr-2" />
              <div className="flex-1">
                <p className="text-sm text-orange-700 font-medium">
                  Invalid Chain Selection
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  Source and destination chains cannot be the same. Cross-chain
                  messaging requires different chains. Please select a different
                  destination chain.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Network Mismatch Warning */}
        {currentChainId !== sourceChainId && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
              <div className="flex-1">
                <p className="text-sm text-yellow-700 font-medium">
                  Network Mismatch Detected
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Your wallet is on{" "}
                  {chainNames[currentChainId] || `Chain ${currentChainId}`} but
                  you need to be on {chainNames[sourceChainId]} to send
                  messages. Click the Switch Chain button or change it manually
                  in your wallet.
                </p>
              </div>
              <button
                onClick={() => switchChain({ chainId: sourceChainId })}
                className="ml-2 px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
              >
                Switch Chain
              </button>
            </div>
          </div>
        )}

        {/* Balance Display */}
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">
                Balance:{" "}
                {userBalance === "Network mismatch" ? (
                  <span className="text-yellow-600">
                    Network mismatch detected - switch to{" "}
                    {chainNames[currentChainId]} in wallet
                  </span>
                ) : userBalance === "Error" ? (
                  <span className="text-red-600">Error loading balance</span>
                ) : userBalance ? (
                  `${parseFloat(userBalance).toFixed(4)} ${getChainNativeToken(
                    currentChainId
                  )}`
                ) : (
                  "Loading..."
                )}
              </span>
              {isCheckingBalance && (
                <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />
              )}
            </div>
            <button
              onClick={checkUserBalance}
              disabled={isCheckingBalance}
              className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Error Display */}
        {lastError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-sm text-red-700">{lastError}</p>
              <button
                onClick={() => setLastError("")}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                ×
              </button>
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
                <span className="font-medium">
                  {estimatedFee} {getChainNativeToken(sourceChainId)}
                </span>
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
              !hyperlaneService ||
              sourceChainId === destChainId
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

import { ethers } from "ethers";

export const HYPERLANE_MAILBOXES = {
  11155111: "0xfFAEF09B3cd11D9b20d1a19bECca54EEC2884766", // Sepolia
  80002: "0x54148470292C24345fb828B003461a9444414517", // Polygon Amoy
  421614: "0x598facE78a4302f11E3de0bee1894Da0b2Cb71F8", // Arbitrum Sepolia
  43113: "0x5b6CFf85442B851A8e6eaBd2A4E4507B5135B3B0", // Avalanche Fuji
};

export const HYPERLANE_DOMAINS = {
  11155111: 11155111, // Sepolia
  80002: 80002, // Polygon Amoy
  421614: 421614, // Arbitrum Sepolia
  43113: 43113, // Avalanche Fuji
};

const MAILBOX_ABI = [
  "function dispatch(uint32 destinationDomain, bytes32 recipientAddress, bytes calldata messageBody) external payable returns (bytes32 messageId)",
  "function quoteDispatch(uint32 destinationDomain, bytes32 recipientAddress, bytes calldata messageBody) external view returns (uint256 fee)",
  "event Dispatch(address indexed sender, uint32 indexed destination, bytes32 indexed recipient, bytes32 messageId)",
  "event Process(uint32 indexed origin, bytes32 indexed sender, bytes32 indexed recipient)",
];

export interface HyperlaneMessage {
  id: string;
  content: string;
  sender: string;
  recipient: string;
  sourceChain: number;
  destChain: number;
  sourceTxHash?: string;
  destTxHash?: string;
  messageId?: string;
  status: "sending" | "sent" | "delivered" | "failed";
  timestamp: number;
  estimatedFee?: string;
  direction: "sent" | "received";
}

export class HyperlaneService {
  private provider: ethers.providers.Web3Provider;
  private signer: ethers.Signer | null = null;
  private currentNetwork: number | null = null;

  constructor(provider: ethers.providers.Web3Provider) {
    this.provider = provider;
    this.setupNetworkChangeHandler();
  }

  private setupNetworkChangeHandler(): void {
    if (typeof window !== "undefined" && window.ethereum) {
      // Listen for network changes
      window.ethereum.on("chainChanged", (chainId: string) => {
        const newChainId = parseInt(chainId, 16);
        console.log("🔄 Network changed to:", newChainId);
        this.handleNetworkChange(newChainId);
      });
    }
  }

  private handleNetworkChange(newChainId: number): void {
    console.log(
      "🔄 Handling network change from",
      this.currentNetwork,
      "to",
      newChainId
    );
    this.currentNetwork = newChainId;
    this.clearCache();

    // Reinitialize provider for the new network
    if (typeof window !== "undefined" && window.ethereum) {
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
    }
  }

  // Method to clear cached state when chain/account changes
  clearCache(): void {
    this.signer = null;
    console.log("🧹 Cleared HyperlaneService cache");
  }

  cleanup(): void {
    // Remove event listeners
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        window.ethereum.removeAllListeners("chainChanged");
      } catch (error) {
        console.warn("⚠️ Error removing listeners:", error);
      }
    }
    this.clearCache();
  }

  async ensureCorrectNetwork(expectedChainId: number): Promise<boolean> {
    try {
      const network = await this.provider.getNetwork();

      if (network.chainId !== expectedChainId) {
        console.warn(
          `⚠️ Network mismatch: expected ${expectedChainId}, got ${network.chainId}`
        );

        // Try to refresh the provider
        if (typeof window !== "undefined" && window.ethereum) {
          this.provider = new ethers.providers.Web3Provider(window.ethereum);
          const newNetwork = await this.provider.getNetwork();

          if (newNetwork.chainId !== expectedChainId) {
            console.warn(
              `⚠️ Still on wrong network after refresh: ${newNetwork.chainId}`
            );
            return false;
          }
        } else {
          return false;
        }
      }

      this.currentNetwork = network.chainId;
      return true;
    } catch (error) {
      console.error("Error checking network:", error);
      return false;
    }
  }

  async getSigner(): Promise<ethers.Signer> {
    // Always refresh the signer to ensure it's connected to the current account/network
    try {
      // Request account access
      await this.provider.send("eth_requestAccounts", []);
      this.signer = this.provider.getSigner();

      // Verify the signer is working by getting the address
      const address = await this.signer.getAddress();
      console.log("✅ Signer connected for address:", address);

      return this.signer;
    } catch (error) {
      console.error("❌ Error getting signer:", error);
      throw new Error(
        `Failed to get wallet signer: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private addressToBytes32(address: string): string {
    return ethers.utils.hexZeroPad(address, 32);
  }

  /**
   * Calculate the byte length of a message when converted to UTF-8 bytes.
   * This is important because Hyperlane charges based on byte length, not character count.
   */
  getMessageByteLength(message: string): number {
    return ethers.utils.toUtf8Bytes(message).length;
  }

  /**
   * Validate message size to prevent failures due to oversized messages.
   *
   * Key improvements:
   * - Validates byte length (not just character count) since UTF-8 chars can be 1-4 bytes
   * - Uses conservative 1KB limit for cross-chain message safety
   * - Provides detailed error messages for debugging
   */
  validateMessageSize(message: string): {
    valid: boolean;
    byteLength: number;
    error?: string;
  } {
    const messageBytes = ethers.utils.toUtf8Bytes(message);
    const byteLength = messageBytes.length;

    // Hyperlane has practical limits, let's be conservative
    const MAX_MESSAGE_BYTES = 1024; // 1KB limit for safety

    if (byteLength > MAX_MESSAGE_BYTES) {
      return {
        valid: false,
        byteLength,
        error: `Message too large: ${byteLength} bytes (max: ${MAX_MESSAGE_BYTES} bytes)`,
      };
    }

    return { valid: true, byteLength };
  }

  /**
   * Estimate cross-chain message fee with improved reliability.
   *
   * Key improvements:
   * - Message size validation before estimation
   * - Better logging with byte length information
   * - 30% buffer added to displayed estimate (vs 20% before)
   * - Improved handling of very small fees (show in wei if needed)
   * - More robust error handling for network changes
   */
  async estimateFee(
    sourceChainId: number,
    destChainId: number,
    recipient: string,
    message: string
  ): Promise<string> {
    try {
      // Validate message size first
      const validation = this.validateMessageSize(message);
      if (!validation.valid) {
        console.warn("⚠️ Message validation failed:", validation.error);
        return "Message too large";
      }

      // Ensure we're on the correct network before proceeding
      const isCorrectNetwork = await this.ensureCorrectNetwork(sourceChainId);
      if (!isCorrectNetwork) {
        console.warn("⚠️ Cannot estimate fee - network mismatch");
        return "0.001"; // Return fallback fee
      }

      const mailboxAddress =
        HYPERLANE_MAILBOXES[sourceChainId as keyof typeof HYPERLANE_MAILBOXES];
      if (!mailboxAddress) {
        throw new Error(`Mailbox not found for chain ${sourceChainId}`);
      }

      const mailbox = new ethers.Contract(
        mailboxAddress,
        MAILBOX_ABI,
        this.provider
      );
      const destDomain =
        HYPERLANE_DOMAINS[destChainId as keyof typeof HYPERLANE_DOMAINS];
      const recipientBytes32 = this.addressToBytes32(recipient);
      const messageBytes = ethers.utils.toUtf8Bytes(message);

      console.log("💰 Calculating fresh fee estimate...", {
        messageLength: message.length,
        byteLength: messageBytes.length,
        sourceChain: sourceChainId,
        destChain: destChainId,
      });

      const fee = await mailbox.quoteDispatch(
        destDomain,
        recipientBytes32,
        messageBytes
      );

      // Add a buffer to the estimate shown to user (30% instead of 20%)
      const bufferedFee = fee.mul(130).div(100);
      const estimatedFee = ethers.utils.formatEther(bufferedFee);

      // Better handling of very small fees
      if (fee.lt(ethers.utils.parseEther("0.000001"))) {
        console.log("💸 Very small fee detected:", fee.toString());
        if (fee.eq(0)) {
          return "0";
        } else {
          // For very small fees, show more precision
          return fee.toString() + " wei";
        }
      }

      return estimatedFee;
    } catch (error) {
      console.error("Error estimating fee:", error);

      // Handle specific network errors
      if (
        error instanceof Error &&
        error.message.includes("underlying network changed")
      ) {
        console.warn(
          "⚠️ Network changed during fee estimation, returning fallback"
        );
        return "0.001";
      }

      // Return a fallback fee instead of throwing
      return "0.001";
    }
  }

  /**
   * Send cross-chain message with enhanced reliability.
   *
   * Key improvements:
   * - Message validation before sending
   * - Larger fee buffer (50% vs 20%) for volatile gas conditions
   * - Increased default gas limits (750k base, 1M fallback)
   * - Larger gas estimation buffer (50% vs 20%)
   * - Better error handling and user feedback
   * - More detailed logging for debugging
   */
  async sendMessage(
    sourceChainId: number,
    destChainId: number,
    recipient: string,
    message: string
  ): Promise<
    | {
        messageId: string;
        txHash: string;
        estimatedFee: string;
        success: true;
      }
    | {
        success: false;
        error: string;
      }
  > {
    try {
      // Validate message size first
      const validation = this.validateMessageSize(message);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || "Message too large",
        };
      }

      // Ensure we're on the correct network before proceeding
      const isCorrectNetwork = await this.ensureCorrectNetwork(sourceChainId);
      if (!isCorrectNetwork) {
        return {
          success: false,
          error: `Network mismatch. Please switch to chain ${sourceChainId} in your wallet and try again.`,
        };
      }

      const signer = await this.getSigner();
      // Check user balance first
      const balance = await signer.getBalance();

      const mailboxAddress =
        HYPERLANE_MAILBOXES[sourceChainId as keyof typeof HYPERLANE_MAILBOXES];

      if (!mailboxAddress) {
        return {
          success: false,
          error: `Mailbox not found for chain ${sourceChainId}`,
        };
      }

      const mailbox = new ethers.Contract(mailboxAddress, MAILBOX_ABI, signer);
      const destDomain =
        HYPERLANE_DOMAINS[destChainId as keyof typeof HYPERLANE_DOMAINS];
      const recipientBytes32 = this.addressToBytes32(recipient);
      const messageBytes = ethers.utils.toUtf8Bytes(message);

      // Get fresh fee estimate for sending
      console.log("🔄 Getting fresh fee estimate for sending...", {
        messageLength: message.length,
        byteLength: messageBytes.length,
      });
      let fee: ethers.BigNumber;
      let estimatedFee: string;

      try {
        fee = await mailbox.quoteDispatch(
          destDomain,
          recipientBytes32,
          messageBytes
        );
        estimatedFee = ethers.utils.formatEther(fee);

        // If fee is extremely small, format it better
        if (fee.lt(ethers.utils.parseEther("0.000001"))) {
          console.log(
            "💸 Very small fee detected, using alternative formatting"
          );
          estimatedFee = fee.eq(0) ? "0" : "< 0.000001";
        }
      } catch (feeError) {
        console.error("❌ Fee estimation failed:", feeError);

        // Handle network change errors specifically
        if (
          feeError instanceof Error &&
          feeError.message.includes("underlying network changed")
        ) {
          return {
            success: false,
            error: "Network changed during operation. Please try again.",
          };
        }

        return {
          success: false,
          error: "Fee estimation failed. Please try again.",
        };
      }

      // Use larger buffer for actual transaction (50% instead of 20%)
      const feeWithBuffer = fee.mul(150).div(100);

      // Check if user has enough balance
      if (balance.lt(feeWithBuffer)) {
        const required = ethers.utils.formatEther(feeWithBuffer);
        const current = ethers.utils.formatEther(balance);
        return {
          success: false,
          error: `Insufficient balance. Required: ${required} ETH/POL, Current: ${current} ETH/POL`,
        };
      }

      // Prepare transaction with detailed logging
      console.log("🔄 Preparing transaction...");
      const txParams = {
        value: feeWithBuffer,
        gasLimit: 750000, // Increased default gas limit
      };

      // Try to estimate gas first with retry logic
      try {
        console.log("⛽ Estimating gas...");
        const estimatedGas = await mailbox.estimateGas.dispatch(
          destDomain,
          recipientBytes32,
          messageBytes,
          txParams
        );
        console.log("⛽ Gas estimation successful:", estimatedGas.toString());
        // Use larger gas buffer (50% instead of 20%)
        txParams.gasLimit = estimatedGas.mul(150).div(100).toNumber();
      } catch (gasError) {
        console.warn(
          "⚠️ Gas estimation failed, using increased default:",
          gasError
        );
        // Use even higher fallback gas limit
        txParams.gasLimit = 1000000;
      }

      console.log("📤 Sending transaction with final params:", txParams);

      // Double-check network before sending transaction
      const finalNetworkCheck = await this.ensureCorrectNetwork(sourceChainId);
      if (!finalNetworkCheck) {
        return {
          success: false,
          error: "Network changed before transaction. Please try again.",
        };
      }

      const tx = await mailbox.dispatch(
        destDomain,
        recipientBytes32,
        messageBytes,
        txParams
      );

      const receipt = await tx.wait();

      let messageId = "";
      if (receipt && receipt.logs) {
        for (const log of receipt.logs) {
          try {
            const parsed = mailbox.interface.parseLog(log);
            if (parsed && parsed.name === "Dispatch") {
              console.log("🚀 Dispatch event parsed:", parsed);
              messageId = parsed.args.messageId;
              break;
            }
          } catch {}
        }
      }

      const result = {
        messageId: messageId || "",
        txHash: receipt?.transactionHash || tx.hash,
        estimatedFee,
        success: true as const,
      };

      console.log("🎊 Message sent successfully:", result);
      return result;
    } catch (error) {
      console.error("💥 Error sending message:", error);

      // Return user-friendly error messages instead of throwing
      if (error instanceof Error) {
        if (error.message.includes("underlying network changed")) {
          return {
            success: false,
            error:
              "Network changed during transaction. Please ensure you're on the correct network and try again.",
          };
        } else if (error.message.includes("insufficient funds")) {
          return {
            success: false,
            error:
              "Insufficient native token balance. Please add more tokens to your wallet.",
          };
        } else if (error.message.includes("user rejected")) {
          return {
            success: false,
            error: "Transaction was rejected by user.",
          };
        } else if (error.message.includes("gas")) {
          return {
            success: false,
            error:
              "Gas estimation failed. Please try again with a different amount.",
          };
        } else if (
          error.message.includes("unknown account") ||
          error.message.includes("UNSUPPORTED_OPERATION")
        ) {
          return {
            success: false,
            error:
              "Wallet connection issue. Please disconnect and reconnect your wallet, or refresh the page and try again.",
          };
        } else if (error.message.includes("Failed to get wallet signer")) {
          return {
            success: false,
            error: "Failed to connect to wallet. Please try again.",
          };
        }
      }

      // Handle MetaMask RPC errors specifically
      if (error && typeof error === "object") {
        const errorObj = error as {
          code?: number;
          reason?: string;
          message?: string;
        };

        // Check for MetaMask RPC errors
        if (errorObj.code === -32603 || errorObj.code === -32000) {
          return {
            success: false,
            error:
              "MetaMask RPC error occurred. This may be due to network congestion. Please try again.",
          };
        }

        // Check for common blockchain errors
        if (errorObj.code === 4001) {
          return {
            success: false,
            error: "Transaction was rejected by user.",
          };
        }

        if (errorObj.reason) {
          return {
            success: false,
            error: `Transaction failed: ${errorObj.reason}`,
          };
        }

        if (errorObj.message) {
          return {
            success: false,
            error: `Transaction failed: ${errorObj.message}`,
          };
        }
      }

      // Fallback error message with proper string conversion
      const errorMessage =
        error instanceof Error
          ? error.message
          : error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : String(error);

      return {
        success: false,
        error: `Transaction failed: ${errorMessage}`,
      };
    }
  }

  async checkMessageDelivery(messageId: string): Promise<{
    delivered: boolean;
    txHash?: string;
  }> {
    try {
      const response = await fetch(
        `https://api.hyperlane.xyz/message/${messageId}`
      );

      if (!response.ok) {
        console.log(`API response not ok: ${response.status}`);
        return { delivered: false };
      }

      const data = await response.json();

      return {
        delivered: data.status === "delivered" || data.delivered === true,
        txHash: data.destinationTxHash || data.txHash,
      };
    } catch (error) {
      console.error("Error checking message delivery via API:", error);
      return { delivered: false };
    }
  }

  async startDeliveryMonitoring(
    messageId: string,
    onStatusUpdate: (status: { delivered: boolean; txHash?: string }) => void,
    maxAttempts: number = 30
  ): Promise<void> {
    let attempts = 0;

    const checkDelivery = async () => {
      attempts++;
      console.log(
        `🔍 Checking delivery attempt ${attempts}/${maxAttempts} for message ${messageId.slice(
          0,
          8
        )}...`
      );

      const result = await this.checkMessageDelivery(messageId);

      if (result.delivered) {
        console.log(`✅ Message delivered! Tx: ${result.txHash}`);
        onStatusUpdate(result);
        return;
      }

      if (attempts >= maxAttempts) {
        console.log(
          `⏰ Monitoring timeout for message ${messageId.slice(0, 8)}`
        );
        onStatusUpdate({ delivered: false });
        return;
      }

      setTimeout(checkDelivery, 10000);
    };

    checkDelivery();
  }

  getMailboxAddress(chainId: number): string | null {
    return (
      HYPERLANE_MAILBOXES[chainId as keyof typeof HYPERLANE_MAILBOXES] || null
    );
  }

  // isChainSupported(chainId: number): boolean {
  //   return chainId in HYPERLANE_MAILBOXES;
  // }

  private getStorageKey(userAddress: string): string {
    return `hyperlane_messages_${userAddress.toLowerCase()}`;
  }

  async saveMessageHistory(
    userAddress: string,
    messages: HyperlaneMessage[]
  ): Promise<void> {
    try {
      const storageKey = this.getStorageKey(userAddress);
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (localError) {
      console.warn("⚠️ Error saving to localStorage:", localError);
    }

    try {
      for (const message of messages) {
        await this.saveMessageToDatabase(userAddress, message);
      }
    } catch (error) {
      console.warn(
        "⚠️ Error saving message history to database (using localStorage):",
        error
      );
    }
  }

  async loadMessageHistory(userAddress: string): Promise<HyperlaneMessage[]> {
    let databaseMessages: HyperlaneMessage[] = [];
    let localMessages: HyperlaneMessage[] = [];

    try {
      const response = await fetch(
        `/api/messages?userAddress=${encodeURIComponent(userAddress)}`
      );
      if (response.ok) {
        const data = await response.json();
        databaseMessages = data.messages || [];
        if (databaseMessages.length > 0) {
          console.log(
            `📡 Loaded ${databaseMessages.length} messages from database`
          );
        }
      }
    } catch (error) {
      console.warn(
        "⚠️ Error loading from database, using localStorage:",
        error
      );
    }

    try {
      const storageKey = this.getStorageKey(userAddress);
      const stored = localStorage.getItem(storageKey);
      localMessages = stored ? JSON.parse(stored) : [];
      if (localMessages.length > 0) {
        console.log(
          `💾 Loaded ${localMessages.length} messages from localStorage`
        );
      }
    } catch (error) {
      console.warn("⚠️ Error loading from localStorage:", error);
    }

    const allMessages = [...databaseMessages, ...localMessages];
    const uniqueMessages = allMessages.filter(
      (msg, index, self) => index === self.findIndex((m) => m.id === msg.id)
    );

    return uniqueMessages.sort((a, b) => b.timestamp - a.timestamp);
  }

  async addMessageToHistory(
    userAddress: string,
    message: HyperlaneMessage
  ): Promise<void> {
    try {
      const messages = await this.loadMessageHistory(userAddress);
      const existingIndex = messages.findIndex((m) => m.id === message.id);

      if (existingIndex >= 0) {
        messages[existingIndex] = message;
      } else {
        messages.unshift(message);
      }

      const trimmedMessages = messages.slice(0, 100);
      const storageKey = this.getStorageKey(userAddress);
      localStorage.setItem(storageKey, JSON.stringify(trimmedMessages));
    } catch (localError) {
      console.warn("⚠️ Error updating localStorage:", localError);
    }

    try {
      await this.saveMessageToDatabase(userAddress, message);
    } catch (error) {
      console.warn(
        "⚠️ Error adding message to database (saved locally):",
        error
      );
    }
  }

  private async saveMessageToDatabase(
    userAddress: string,
    message: HyperlaneMessage
  ): Promise<void> {
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userAddress,
          message,
        }),
      });

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const result = await response.json();
      if (result.savedToDatabase) {
        console.log("💾 Message saved to database successfully");
      } else {
        console.warn(
          "⚠️ Message not saved to database, using localStorage fallback"
        );
      }
    } catch (error) {
      console.warn("⚠️ Failed to save to database:", error);
    }
  }

  // async updateMessageStatusInDatabase(
  //   messageId: string,
  //   status: HyperlaneMessage["status"],
  //   destTxHash?: string
  // ): Promise<void> {
  //   try {
  //     const response = await fetch("/api/messages", {
  //       method: "PATCH",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         messageId,
  //         status,
  //         destTxHash,
  //       }),
  //     });

  //     if (response.ok) {
  //       const result = await response.json();
  //       if (result.updatedInDatabase) {
  //         console.log("📝 Message status updated in database");
  //       } else {
  //         console.warn("⚠️ Message status not updated in database");
  //       }
  //     }
  //   } catch (error) {
  //     console.warn("⚠️ Error updating message status in database:", error);
  //   }
  // }

  async listenForIncomingMessages(
    userAddress: string,
    chainIds: number[],
    onMessageReceived: (message: HyperlaneMessage) => void
  ): Promise<void> {
    const recipientBytes32 = this.addressToBytes32(userAddress);

    for (const chainId of chainIds) {
      const mailboxAddress = this.getMailboxAddress(chainId);
      if (!mailboxAddress) continue;

      try {
        const mailbox = new ethers.Contract(
          mailboxAddress,
          MAILBOX_ABI,
          this.provider
        );

        const filter = mailbox.filters.Process(null, null, recipientBytes32);

        mailbox.on(filter, async (origin, sender, recipient, event) => {
          console.log("📨 Incoming message detected:", {
            origin,
            sender,
            recipient,
            chainId,
          });

          const receivedMessage: HyperlaneMessage = {
            id: `received_${event.transactionHash}_${Date.now()}`,
            content: "Message received",
            sender: ethers.utils.hexStripZeros(sender),
            recipient: userAddress,
            sourceChain: origin,
            destChain: chainId,
            destTxHash: event.transactionHash,
            status: "delivered",
            timestamp: Date.now(),
            direction: "received",
          };

          onMessageReceived(receivedMessage);
        });
      } catch (error) {
        console.error(`Error setting up listener for chain ${chainId}:`, error);
      }
    }
  }

  // async getHistoricalIncomingMessages(
  //   userAddress: string,
  //   chainIds: number[],
  //   fromBlock: number = -50000
  // ): Promise<HyperlaneMessage[]> {
  //   const incomingMessages: HyperlaneMessage[] = [];
  //   const recipientBytes32 = this.addressToBytes32(userAddress);

  //   for (const chainId of chainIds) {
  //     const mailboxAddress = this.getMailboxAddress(chainId);
  //     if (!mailboxAddress) continue;

  //     try {
  //       const mailbox = new ethers.Contract(
  //         mailboxAddress,
  //         MAILBOX_ABI,
  //         this.provider
  //       );

  //       const currentBlock = await this.provider.getBlockNumber();
  //       const startBlock = Math.max(0, currentBlock + fromBlock);

  //       const filter = mailbox.filters.Process(null, null, recipientBytes32);
  //       const events = await mailbox.queryFilter(filter, startBlock, "latest");

  //       for (const event of events) {
  //         const block = await this.provider.getBlock(event.blockNumber);

  //         const message: HyperlaneMessage = {
  //           id: `received_${event.transactionHash}_${event.logIndex}`,
  //           content: "Message received",
  //           sender: ethers.utils.hexStripZeros(event.args?.sender || "0x0"),
  //           recipient: userAddress,
  //           sourceChain: event.args?.origin || 0,
  //           destChain: chainId,
  //           destTxHash: event.transactionHash,
  //           status: "delivered",
  //           timestamp: block.timestamp * 1000,
  //           direction: "received",
  //         };

  //         incomingMessages.push(message);
  //       }
  //     } catch (error) {
  //       console.error(
  //         `Error fetching historical messages for chain ${chainId}:`,
  //         error
  //       );
  //     }
  //   }

  //   return incomingMessages.sort((a, b) => b.timestamp - a.timestamp);
  // }
}

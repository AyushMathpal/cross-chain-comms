import mongoose from "mongoose";
import { HyperlaneMessage } from "./hyperlane";

const MONGODB_URI = process.env.MONGODB_URI || "";

let isConnected = false;
let connectionAttempted = false;
let connectionError: string | null = null;

export async function connectToDatabase(): Promise<boolean> {
  if (isConnected) {
    return true;
  }

  if (connectionAttempted && connectionError) {
    return false;
  }

  if (!MONGODB_URI) {
    console.warn("⚠️ MONGODB_URI not provided - using localStorage fallback");
    connectionError = "No MONGODB_URI provided";
    connectionAttempted = true;
    return false;
  }

  connectionAttempted = true;

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    });
    isConnected = true;
    connectionError = null;
    console.log("✅ Connected to MongoDB Atlas");
    return true;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    connectionError = errorMessage;
    console.warn("⚠️ Failed to connect to MongoDB:", errorMessage);
    console.warn("📱 Falling back to localStorage for persistence");
    return false;
  }
}

const messageSchema = new mongoose.Schema(
  {
    messageId: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    sender: { type: String, required: true },
    recipient: { type: String, required: true },
    sourceChain: { type: Number, required: true },
    destChain: { type: Number, required: true },
    sourceTxHash: { type: String },
    destTxHash: { type: String },
    hyperlaneMessageId: { type: String },
    status: {
      type: String,
      enum: ["sending", "sent", "delivered", "failed"],
      required: true,
    },
    timestamp: { type: Date, required: true },
    estimatedFee: { type: String },
    direction: {
      type: String,
      enum: ["sent", "received"],
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "messages",
  }
);

messageSchema.index({ sender: 1, timestamp: -1 });
messageSchema.index({ recipient: 1, timestamp: -1 });
messageSchema.index({ hyperlaneMessageId: 1 });

let Message: mongoose.Model<mongoose.Document> | null = null;

function getMessageModel() {
  if (!Message) {
    Message =
      mongoose.models.Message || mongoose.model("Message", messageSchema);
  }
  return Message;
}

export interface DatabaseService {
  saveMessage(userAddress: string, message: HyperlaneMessage): Promise<boolean>;
  getMessages(
    userAddress: string,
    direction?: "sent" | "received"
  ): Promise<HyperlaneMessage[]>;
  updateMessageStatus(
    messageId: string,
    status: HyperlaneMessage["status"],
    destTxHash?: string
  ): Promise<boolean>;
  deleteOldMessages(userAddress: string, keepCount?: number): Promise<boolean>;
  isAvailable(): Promise<boolean>;
}

export class MongoDBService implements DatabaseService {
  private isInitialized = false;

  async isAvailable(): Promise<boolean> {
    if (!this.isInitialized) {
      this.isInitialized = true;
      return await connectToDatabase();
    }
    return isConnected;
  }

  async saveMessage(
    userAddress: string,
    message: HyperlaneMessage
  ): Promise<boolean> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        return false;
      }

      const MessageModel = getMessageModel();
      const messageDoc = new MessageModel({
        messageId: message.id,
        content: message.content,
        sender: message.sender.toLowerCase(),
        recipient: message.recipient.toLowerCase(),
        sourceChain: message.sourceChain,
        destChain: message.destChain,
        sourceTxHash: message.sourceTxHash,
        destTxHash: message.destTxHash,
        hyperlaneMessageId: message.messageId,
        status: message.status,
        timestamp: new Date(message.timestamp),
        estimatedFee: message.estimatedFee,
        direction: message.direction,
      });

      await messageDoc.save();
      console.log("💾 Message saved to database:", message.id);
      return true;
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as { code: number }).code === 11000
      ) {
        return await this.updateMessage(message);
      } else {
        console.warn("⚠️ Failed to save message to database:", error);
        return false;
      }
    }
  }

  private async updateMessage(message: HyperlaneMessage): Promise<boolean> {
    try {
      const MessageModel = getMessageModel();
      await MessageModel.updateOne(
        { messageId: message.id },
        {
          $set: {
            content: message.content,
            sender: message.sender,
            recipient: message.recipient,
            sourceChain: message.sourceChain,
            destChain: message.destChain,
            sourceTxHash: message.sourceTxHash,
            destTxHash: message.destTxHash,
            hyperlaneMessageId: message.messageId,
            status: message.status,
            timestamp: new Date(message.timestamp),
            estimatedFee: message.estimatedFee,
            direction: message.direction,
          },
        }
      );
      console.log("🔄 Message updated in database:", message.id);
      return true;
    } catch (error) {
      console.warn("⚠️ Failed to update message in database:", error);
      return false;
    }
  }

  async getMessages(
    userAddress: string,
    direction?: "sent" | "received"
  ): Promise<HyperlaneMessage[]> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        return [];
      }

      const MessageModel = getMessageModel();
      let query: Record<string, unknown> = {};

      if (direction === "sent") {
        query = { sender: userAddress };
      } else if (direction === "received") {
        query = { recipient: userAddress };
      } else {
        query = {
          $or: [{ sender: userAddress }, { recipient: userAddress }],
        };
      }

      const messages = await MessageModel.find(query)
        .sort({ timestamp: -1 })
        .limit(100)
        .lean()
        .exec();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return messages.map((msg: any) => {
        const actualDirection =
          msg.sender === userAddress ? "sent" : "received";

        return {
          id: msg.messageId,
          content: msg.content,
          sender: msg.sender,
          recipient: msg.recipient,
          sourceChain: msg.sourceChain,
          destChain: msg.destChain,
          sourceTxHash: msg.sourceTxHash,
          destTxHash: msg.destTxHash,
          messageId: msg.hyperlaneMessageId,
          status: msg.status,
          timestamp: msg.timestamp.getTime(),
          estimatedFee: msg.estimatedFee,
          direction: actualDirection,
        };
      });
    } catch (error) {
      console.warn("⚠️ Failed to fetch messages from database:", error);
      return [];
    }
  }

  async updateMessageStatus(
    messageId: string,
    status: HyperlaneMessage["status"],
    destTxHash?: string
  ): Promise<boolean> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        return false;
      }

      const MessageModel = getMessageModel();
      const updateData: Record<string, unknown> = { status };
      if (destTxHash) {
        updateData.destTxHash = destTxHash;
      }

      await MessageModel.updateOne({ messageId }, { $set: updateData });

      console.log("📝 Message status updated:", messageId, status);
      return true;
    } catch (error) {
      console.warn("⚠️ Failed to update message status:", error);
      return false;
    }
  }

  async deleteOldMessages(
    userAddress: string,
    keepCount: number = 100
  ): Promise<boolean> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        return false;
      }

      const MessageModel = getMessageModel();

      const allMessages = await MessageModel.find({
        $or: [{ sender: userAddress }, { recipient: userAddress }],
      })
        .sort({ timestamp: -1 })
        .select("_id")
        .lean()
        .exec();

      if (allMessages.length > keepCount) {
        const messagesToDelete = allMessages.slice(keepCount);
        const idsToDelete = messagesToDelete.map((msg) => msg._id);

        await MessageModel.deleteMany({
          _id: { $in: idsToDelete },
        });

        console.log(
          `🗑️ Deleted ${idsToDelete.length} old messages for user ${userAddress}`
        );
      }
      return true;
    } catch (error) {
      console.warn("⚠️ Failed to delete old messages:", error);
      return false;
    }
  }
}

export const dbService = new MongoDBService();

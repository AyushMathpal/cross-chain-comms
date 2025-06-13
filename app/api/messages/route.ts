import { NextRequest, NextResponse } from "next/server";
import { dbService } from "../../lib/database";
import { HyperlaneMessage } from "../../lib/hyperlane";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get("userAddress");
    const direction = searchParams.get("direction") as
      | "sent"
      | "received"
      | null;

    if (!userAddress) {
      return NextResponse.json(
        { error: "User address is required", messages: [] },
        { status: 400 }
      );
    }

    const messages = await dbService.getMessages(
      userAddress,
      direction || undefined
    );

    return NextResponse.json({
      messages: messages || [],
      fromDatabase: messages && messages.length > 0 ? true : false,
    });
  } catch (error) {
    console.warn("⚠️ API Error fetching messages:", error);
    return NextResponse.json({
      messages: [],
      fromDatabase: false,
      error: "Database temporarily unavailable",
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userAddress, message } = body;

    if (!userAddress || !message) {
      return NextResponse.json(
        {
          success: false,
          error: "User address and message are required",
        },
        { status: 400 }
      );
    }

    const saved = await dbService.saveMessage(
      userAddress,
      message as HyperlaneMessage
    );

    return NextResponse.json({
      success: true,
      savedToDatabase: saved,
      message: saved
        ? "Message saved to database"
        : "Message will be stored locally",
    });
  } catch (error) {
    console.warn("⚠️ API Error saving message:", error);
    return NextResponse.json({
      success: true,
      savedToDatabase: false,
      message: "Message will be stored locally (database unavailable)",
    });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, status, destTxHash } = body;

    if (!messageId || !status) {
      return NextResponse.json(
        {
          success: false,
          error: "Message ID and status are required",
        },
        { status: 400 }
      );
    }

    const updated = await dbService.updateMessageStatus(
      messageId,
      status,
      destTxHash
    );

    return NextResponse.json({
      success: true,
      updatedInDatabase: updated,
      message: updated
        ? "Status updated in database"
        : "Status update will be handled locally",
    });
  } catch (error) {
    console.warn("⚠️ API Error updating message status:", error);
    return NextResponse.json({
      success: true,
      updatedInDatabase: false,
      message: "Status update will be handled locally (database unavailable)",
    });
  }
}

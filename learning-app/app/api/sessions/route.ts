import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: Fetch the latest completed session for a viewer+source to get lastCheckpoint
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const viewerId = searchParams.get("viewerId");
  const sourceId = searchParams.get("sourceId");

  if (!viewerId || !sourceId) {
    return NextResponse.json(
      { error: "viewerId and sourceId are required" },
      { status: 400 }
    );
  }

  // Find the most recent completed session to get the last checkpoint
  const lastSession = await prisma.session.findFirst({
    where: {
      viewerId,
      sourceId,
      status: "completed",
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    lastCheckpoint: lastSession?.endTime ?? 0,
    lastSession,
  });
}

// POST: Create a new session when user clicks "Check me"
export async function POST(request: NextRequest) {
  try {
    const { viewerId, sourceId, startTime, endTime } = await request.json();

    if (!viewerId || !sourceId || startTime === undefined || endTime === undefined) {
      return NextResponse.json(
        { error: "viewerId, sourceId, startTime, and endTime are required" },
        { status: 400 }
      );
    }

    const session = await prisma.session.create({
      data: {
        viewerId,
        sourceId,
        startTime,
        endTime,
        status: "challenging",
      },
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

// PATCH: Update session status (e.g., mark as completed)
export async function PATCH(request: NextRequest) {
  try {
    const { sessionId, status } = await request.json();

    if (!sessionId || !status) {
      return NextResponse.json(
        { error: "sessionId and status are required" },
        { status: 400 }
      );
    }

    const session = await prisma.session.update({
      where: { id: sessionId },
      data: { status },
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Error updating session:", error);
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    );
  }
}

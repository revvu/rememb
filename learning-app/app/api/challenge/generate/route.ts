import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import prisma from "@/lib/prisma";
import { AI_CONFIG } from "@/lib/ai-config";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not set" },
        { status: 500 }
      );
    }

    const { sourceId } = await request.json();

    if (!sourceId) {
      return NextResponse.json(
        { error: "sourceId is required" },
        { status: 400 }
      );
    }

    // Fetch the source with transcript
    const source = await prisma.source.findUnique({
      where: { id: sourceId }
    });

    if (!source) {
      return NextResponse.json(
        { error: "Source not found" },
        { status: 404 }
      );
    }

    // Get a portion of the transcript (first ~5000 chars to stay within token limits)
    const transcriptPortion = source.transcript.slice(0, 5000);
    const config = AI_CONFIG.challengeGeneration;

    const msg = await anthropic.messages.create({
      model: config.model,
      max_tokens: config.maxTokens,
      messages: [
        {
          role: "user",
          content: config.prompt(source.title, transcriptPortion),
        },
      ],
    });

    const text = (msg.content[0] as { type: 'text'; text: string }).text;
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error("No JSON found in response");
    }

    const cleanText = text.substring(firstBrace, lastBrace + 1);
    const data = JSON.parse(cleanText);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error generating challenges:", error);
    if (error instanceof Anthropic.APIError) {
      console.error("Anthropic API Error Status:", error.status);
      console.error("Anthropic API Error Message:", error.message);
    }
    return NextResponse.json(
      { error: "Failed to generate challenges", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import prisma from "@/lib/prisma";

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

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are an expert educator who creates genuinely challenging problems that test deep understanding, not surface-level recall.

Based on the following video transcript titled "${source.title}", generate 3 challenging problems that:
1. Require 5-15 minutes of thought to solve
2. Test actual understanding, not memorization
3. Make the learner think "oh, I didn't see it that way before"
4. Are engaging and interesting to work on

TRANSCRIPT:
${transcriptPortion}

Create 3 problems of these types:
1. "construction" - Design/build something that satisfies constraints from the content
2. "application" - Apply a concept to a novel, unexpected scenario
3. "connection" - Connect ideas from the content to something broader or in a different domain

Output strictly valid JSON with this structure:
{
  "problems": [
    {
      "id": "p1",
      "type": "construction",
      "text": "...",
      "difficulty": "Medium"
    },
    {
      "id": "p2",
      "type": "application",
      "text": "...",
      "difficulty": "Hard"
    },
    {
      "id": "p3",
      "type": "connection",
      "text": "...",
      "difficulty": "Medium"
    }
  ]
}

IMPORTANT:
- Problems must be specifically about the content in the transcript, not generic
- Each problem should require genuine thinking and creativity
- Do not include markdown formatting. Just the raw JSON string.`,
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

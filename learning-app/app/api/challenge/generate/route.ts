import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import prisma from "@/lib/prisma";
import { AI_CONFIG } from "@/lib/ai-config";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// Parse timestamp from a line, returns seconds or null
function parseTimestamp(line: string): number | null {
  const match = line.match(/\[(\d+):(\d+)\]/);
  if (!match) return null;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}

// Extract transcript lines between start and end timestamps
function extractTranscriptRange(transcript: string, startSec: number, endSec: number): string {
  const lines = transcript.split('\n');

  // First, try exact range
  let result = lines.filter(line => {
    const seconds = parseTimestamp(line);
    if (seconds === null) return false;
    return seconds >= startSec && seconds <= endSec;
  });

  // If no results, try expanding the range by 30 seconds on each side
  if (result.length === 0) {
    console.log(`[extractTranscriptRange] No lines in range ${startSec}-${endSec}, expanding range`);
    result = lines.filter(line => {
      const seconds = parseTimestamp(line);
      if (seconds === null) return false;
      return seconds >= Math.max(0, startSec - 30) && seconds <= endSec + 30;
    });
  }

  // If still no results, find the nearest lines to the requested range
  if (result.length === 0) {
    console.log(`[extractTranscriptRange] Expanded range still empty, finding nearest lines`);
    const linesWithTimestamps = lines
      .map(line => ({ line, seconds: parseTimestamp(line) }))
      .filter(item => item.seconds !== null) as { line: string; seconds: number }[];

    if (linesWithTimestamps.length > 0) {
      // Find lines closest to startSec
      linesWithTimestamps.sort((a, b) =>
        Math.abs(a.seconds - startSec) - Math.abs(b.seconds - startSec)
      );
      // Take up to 10 nearest lines
      result = linesWithTimestamps.slice(0, 10).map(item => item.line);
      console.log(`[extractTranscriptRange] Using ${result.length} nearest lines`);
    }
  }

  return result.join('\n');
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not set" },
        { status: 500 }
      );
    }

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    // Fetch the session with its source
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { source: true }
    });

    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Extract only the transcript portion for this session's time range
    const startTime = session.startTime;
    const endTime = session.endTime || session.startTime + 300; // fallback to 5 min if no endTime

    console.log(`[generate] Session ${sessionId}: startTime=${startTime}, endTime=${endTime}`);
    console.log(`[generate] Transcript length: ${session.source.transcript?.length || 0} chars`);

    if (!session.source.transcript || session.source.transcript.trim().length === 0) {
      console.error(`[generate] Empty transcript for source ${session.sourceId}`);
      return NextResponse.json(
        { error: "This video has no transcript available" },
        { status: 400 }
      );
    }

    const transcriptPortion = extractTranscriptRange(
      session.source.transcript,
      startTime,
      endTime
    );

    console.log(`[generate] Extracted transcript portion: ${transcriptPortion.length} chars`);

    if (!transcriptPortion.trim()) {
      // This should rarely happen now with the fallback logic
      console.error(`[generate] Could not extract any transcript content`);
      return NextResponse.json(
        { error: "Could not extract transcript for this time range. Please try a different segment." },
        { status: 400 }
      );
    }

    const config = AI_CONFIG.challengeGeneration;

    const msg = await anthropic.messages.create({
      model: config.model,
      max_tokens: config.maxTokens,
      messages: [
        {
          role: "user",
          content: config.prompt(session.source.title, transcriptPortion),
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

    // Validate that we have problems
    if (!data.problems || !Array.isArray(data.problems) || data.problems.length === 0) {
      throw new Error("AI response did not contain valid problems");
    }

    // Save problems to database
    const savedProblems = await Promise.all(
      data.problems.map(async (p: {
        id: string;
        type: string;
        text: string;
        difficulty: string;
        options?: string[];
        correctAnswer?: unknown;
        columnA?: string[];
        columnB?: string[];
      }, idx: number) => {
        // Build options JSON based on problem type
        let optionsJson: string | null = null;
        if (p.options) {
          optionsJson = JSON.stringify(p.options);
        } else if (p.columnA && p.columnB) {
          optionsJson = JSON.stringify({ columnA: p.columnA, columnB: p.columnB });
        }

        const problem = await prisma.problem.create({
          data: {
            sessionId,
            problemText: p.text,
            problemType: p.type,
            difficulty: p.difficulty?.toLowerCase() || 'medium',
            options: optionsJson,
            solution: p.correctAnswer !== undefined ? JSON.stringify(p.correctAnswer) : null,
            order: idx
          }
        });

        // Return problem with all fields needed by frontend
        return {
          id: problem.id,
          type: p.type,
          text: p.text,
          difficulty: p.difficulty,
          options: p.options,
          columnA: p.columnA,
          columnB: p.columnB
        };
      })
    );

    console.log(`[generate] Saved ${savedProblems.length} problems for session ${sessionId}`);

    return NextResponse.json({ problems: savedProblems });
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

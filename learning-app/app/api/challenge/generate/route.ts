import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function POST() {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not set" },
        { status: 500 }
      );
    }

    const msg = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `
            You are an expert tutor in Deep Learning.
            Generate 3 distinct challenge problems based on the topic "Neural Networks" (specifically: neurons, perceptrons, weights, biases, sigmoid activation).
            
            The problems should be of these types:
            1. "concept": Test conceptual understanding.
            2. "math": A mathematical derivation or calculation question.
            3. "code": A small coding task (Python/Pseudocode).

            Output strictly valid JSON with this structure:
            {
              "problems": [
                {
                  "id": "p1",
                  "type": "concept",
                  "text": "...",
                  "difficulty": "Medium"
                },
                {
                  "id": "p2",
                  "type": "math",
                  "text": "...",
                  "difficulty": "Hard"
                },
                {
                  "id": "p3",
                  "type": "code",
                  "text": "...",
                  "difficulty": "Medium"
                }
              ]
            }
            Do not include markdown formatting like \`\`\`json. Just the raw JSON string.
          `,
        },
      ],
    });

    const text = (msg.content[0] as any).text;
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
      console.error("Anthropic API Error Details:", error.error);
    }
    return NextResponse.json(
      { error: "Failed to generate challenges", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

export async function POST(req: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not set" },
        { status: 500 }
      );
    }

    const { question, answer } = await req.json();

    if (!question || !answer) {
      return NextResponse.json(
        { error: "Missing question or answer" },
        { status: 400 }
      );
    }

    const msg = await anthropic.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `
            You are an expert tutor. Evaluate the student's answer to the following question.
            
            Question: "${question}"
            Student Answer: "${answer}"

            Determine if the answer is correct or demonstrates a good understanding. 
            Provide constructive feedback. If incorrect, explain why without giving the full answer immediately if possible, or guide them.
            Suggest a brief "next step" or follow-up thought.

            Output strictly valid JSON with this structure:
            {
              "isCorrect": boolean,
              "feedback": "string",
              "nextStep": "string"
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
    console.error("Error evaluating answer:", error);
    return NextResponse.json(
      { error: "Failed to evaluate answer", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

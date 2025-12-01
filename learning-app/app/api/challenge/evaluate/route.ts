import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { AI_CONFIG } from "@/lib/ai-config";
import prisma from "@/lib/prisma";

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

    const { problemId, question, answer, problemType, options, correctAnswer } = await req.json();

    if (!question || !answer) {
      return NextResponse.json(
        { error: "Missing question or answer" },
        { status: 400 }
      );
    }

    const config = AI_CONFIG.answerEvaluation;

    // Build context for structured question types
    let evaluationContext = "";
    if (problemType === "multiple_choice" || problemType === "multi_select") {
      evaluationContext = `\nQuestion type: ${problemType}\nOptions: ${JSON.stringify(options)}\nCorrect answer: ${JSON.stringify(correctAnswer)}`;
    } else if (problemType === "true_false") {
      evaluationContext = `\nQuestion type: true/false\nCorrect answer: ${correctAnswer}`;
    } else if (problemType === "matching") {
      evaluationContext = `\nQuestion type: matching\nCorrect matches: ${JSON.stringify(correctAnswer)}`;
    }

    const msg = await anthropic.messages.create({
      model: config.model,
      max_tokens: config.maxTokens,
      messages: [
        {
          role: "user",
          content: config.prompt(question + evaluationContext, answer),
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

    // Save the answer and evaluation to database if problemId provided
    if (problemId) {
      try {
        await prisma.problem.update({
          where: { id: problemId },
          data: {
            userAnswer: typeof answer === 'string' ? answer : JSON.stringify(answer),
            isCorrect: data.isCorrect,
            feedback: data.feedback
          }
        });
        console.log(`[evaluate] Saved evaluation for problem ${problemId}: isCorrect=${data.isCorrect}`);
      } catch (dbError) {
        console.error(`[evaluate] Failed to save evaluation for problem ${problemId}:`, dbError);
        // Continue anyway - evaluation was successful even if save failed
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error evaluating answer:", error);
    return NextResponse.json(
      { error: "Failed to evaluate answer", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";

export async function POST() {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Mocked response
  return NextResponse.json({
    isCorrect: true,
    feedback: "Excellent explanation! You correctly identified that a single-layer perceptron can only form a linear decision boundary, while XOR requires a non-linear boundary. Adding a hidden layer allows the network to transform the input space, making it linearly separable.",
    nextStep: "Great job! Let's move to the mathematical derivation.",
  });
}

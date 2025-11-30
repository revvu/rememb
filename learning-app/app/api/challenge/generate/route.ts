import { NextResponse } from "next/server";

export async function POST() {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Mocked response
  const problems = [
    {
      id: "p1",
      type: "concept",
      text: "Explain why a single-layer perceptron cannot solve the XOR problem, and how adding a hidden layer resolves this.",
      difficulty: "Medium",
    },
    {
      id: "p2",
      type: "math",
      text: "Given a sigmoid activation function σ(z) = 1 / (1 + e^(-z)), derive its derivative σ'(z) in terms of σ(z).",
      difficulty: "Hard",
    },
    {
      id: "p3",
      type: "code",
      text: "Implement a simple neuron forward pass in Python that takes inputs [x1, x2] and weights [w1, w2] with a bias b, using a ReLU activation function.",
      difficulty: "Medium",
    },
  ];

  return NextResponse.json({ problems });
}
